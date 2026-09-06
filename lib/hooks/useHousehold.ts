import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Household, HouseholdPreferences, Profile } from '../database.types';
import { useUser, useProfile } from './useAuth';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const HOUSEHOLD_KEY = 'household';
const MEMBERS_KEY = 'household_members';
const INVITES_KEY = 'household_invites';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HouseholdInvite = {
  id: string;
  household_id: string;
  invited_email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  households?: { name: string };
};

// ─── Fetch hooks ──────────────────────────────────────────────────────────────

/** Fetch the current user's household */
export function useHousehold() {
  const profile = useProfile();

  return useQuery({
    queryKey: [HOUSEHOLD_KEY, profile?.household_id],
    queryFn: async (): Promise<Household | null> => {
      if (!profile?.household_id) return null;
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', profile.household_id)
        .single();
      if (error) throw error;
      return data as Household;
    },
    enabled: !!profile?.household_id,
  });
}

/** Fetch all members of the current household */
export function useHouseholdMembers() {
  const profile = useProfile();

  return useQuery({
    queryKey: [MEMBERS_KEY, profile?.household_id],
    queryFn: async (): Promise<Profile[]> => {
      if (!profile?.household_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', profile.household_id);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile?.household_id,
  });
}

/** Fetch invites SENT from this household (to see who's been invited) */
export function useSentInvites() {
  const profile = useProfile();

  return useQuery({
    queryKey: [INVITES_KEY, 'sent', profile?.household_id],
    queryFn: async (): Promise<HouseholdInvite[]> => {
      if (!profile?.household_id) return [];
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', profile.household_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HouseholdInvite[];
    },
    enabled: !!profile?.household_id,
  });
}

/** Fetch pending invites addressed to the current user's email */
export function usePendingInvites() {
  const profile = useProfile();

  return useQuery({
    queryKey: [INVITES_KEY, 'pending', profile?.email],
    queryFn: async (): Promise<HouseholdInvite[]> => {
      if (!profile?.email) return [];
      const { data, error } = await supabase
        .from('household_invites')
        .select('*, households(name)')
        .eq('invited_email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HouseholdInvite[];
    },
    enabled: !!profile?.email,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Update shared planning preferences on the household.
 * These override per-user profile preferences so all members see the same plan structure.
 * Applies an optimistic update so the UI feels instant even before the server responds.
 */
export function useUpdateHouseholdPreferences() {
  const qc = useQueryClient();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    // Optimistic update — apply immediately so the settings UI reflects the
    // change without waiting for the round-trip to Supabase.
    onMutate: async (updates: Partial<HouseholdPreferences>) => {
      // Read fresh from store — the component may not have re-rendered yet
      const freshProfile = useAuthStore.getState().profile;
      if (!freshProfile?.household_id) return;
      await qc.cancelQueries({ queryKey: [HOUSEHOLD_KEY, freshProfile.household_id] });
      const previous = qc.getQueryData<Household | null>([HOUSEHOLD_KEY, freshProfile.household_id]);
      qc.setQueryData<Household | null>([HOUSEHOLD_KEY, freshProfile.household_id], (old) =>
        old
          ? { ...old, preferences: { ...(old.preferences ?? {}), ...updates } as HouseholdPreferences }
          : old
      );
      return { previous, householdId: freshProfile.household_id };
    },

    mutationFn: async (updates: Partial<HouseholdPreferences>) => {
      const freshProfile = useAuthStore.getState().profile;
      if (!freshProfile?.household_id) throw new Error('No household');

      // Use SECURITY DEFINER RPC — merges the JSONB patch server-side,
      // avoiding the auth.uid() RLS race condition.
      const { error } = await supabase
        .rpc('update_household_preferences', { prefs: updates as Record<string, unknown> });

      if (error) throw error;
    },

    onError: (err: Error, _vars, context: { previous?: Household | null; householdId?: string } | undefined) => {
      // Roll back the optimistic update on failure
      if (context?.householdId && context.previous !== undefined) {
        qc.setQueryData([HOUSEHOLD_KEY, context.householdId], context.previous);
      }
      showToast(err.message, 'error');
    },

    onSuccess: (_data, _vars, context) => {
      const hid = context?.householdId ?? useAuthStore.getState().profile?.household_id;
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY, hid] });
    },
  });
}

/** Create a new household and link the current user's profile to it */
export function useCreateHousehold() {
  const qc = useQueryClient();
  const user = useUser();
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (name: string): Promise<Household> => {
      if (!user) throw new Error('Not authenticated');

      // SECURITY DEFINER RPC — creates household and links profile atomically,
      // bypassing the auth.uid() RLS race that blocks direct INSERT.
      const { data: newId, error } = await supabase
        .rpc('create_household_for_user', { household_name: name.trim() });

      if (error) throw error;

      // Update local store — RPC already updated Supabase.
      const cur = useAuthStore.getState().profile;
      if (cur) useAuthStore.getState().setProfile({ ...cur, household_id: newId as string });

      // Migrate all existing solo data (recipes, books, rules, prefs, plans, lists)
      // into the new household so nothing is lost.
      try {
        await supabase.rpc('merge_user_data_into_household', {
          p_user_id: user.id,
          p_household_id: newId as string,
        });
      } catch {
        // Non-fatal — data can still be accessed solo
      }

      // Fetch the full row for display (SELECT policy now passes since
      // the profile's household_id was just set by the RPC).
      const { data: household } = await supabase
        .from('households')
        .select('*')
        .eq('id', newId)
        .single();

      // Auto-generate an invite code if the household doesn't have one yet.
      if (household && !household.invite_code) {
        await supabase.rpc('regenerate_household_invite_code');
      }

      return (household ?? {
        id: newId as string,
        name: name.trim(),
        preferences: { meal_slots: 'dinner_only', planning_mode: 'weekly' },
        created_at: new Date().toISOString(),
      }) as Household;
    },
    onSuccess: (household) => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
      qc.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      showToast(`Household "${household.name}" created!`, 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Invite someone by email to the current household */
export function useInviteMember() {
  const qc = useQueryClient();
  const user = useUser();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!user || !profile?.household_id) {
        throw new Error('You need a household before inviting members');
      }

      // Check if they already have a pending invite
      const { data: existing } = await supabase
        .from('household_invites')
        .select('id')
        .eq('household_id', profile.household_id)
        .eq('invited_email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) throw new Error('An invite is already pending for that email');

      const { error } = await supabase.from('household_invites').insert({
        household_id: profile.household_id,
        invited_email: email.toLowerCase().trim(),
        invited_by: user.id,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVITES_KEY, 'sent'] });
      showToast('Invite sent!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Accept a pending invite — links the user to that household */
export function useAcceptInvite() {
  const qc = useQueryClient();
  const user = useUser();
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ inviteId, householdId }: { inviteId: string; householdId: string }) => {
      // Update invite status
      const { error: inviteError } = await supabase
        .from('household_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      if (inviteError) throw inviteError;

      // Join the household
      await updateProfile({ household_id: householdId });

      // Merge all solo data (recipes, books, rules, prefs, plans, lists) into household.
      if (user) {
        try {
          await supabase.rpc('merge_user_data_into_household', {
            p_user_id: user.id,
            p_household_id: householdId,
          });
        } catch {
          // Non-fatal
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
      qc.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      qc.invalidateQueries({ queryKey: [INVITES_KEY] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe_books'] });
      showToast('Joined household!', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Decline a pending invite */
export function useDeclineInvite() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('household_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVITES_KEY] });
      showToast('Invite declined', 'info');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Cancel a sent invite */
export function useCancelInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('household_invites')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVITES_KEY, 'sent'] });
    },
  });
}

/** Leave the current household (sets household_id to null) */
export function useLeaveHousehold() {
  const qc = useQueryClient();
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      await updateProfile({ household_id: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
      qc.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      showToast('Left household', 'info');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}

/** Regenerate the household invite code */
export function useRegenerateInviteCode() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('regenerate_household_invite_code');
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

/** Join a household using a short invite code */
export function useJoinByCode() {
  const qc = useQueryClient();
  const user = useUser();
  const { updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const { data: householdId, error } = await supabase
        .rpc('join_household_by_code', { p_code: code.trim().toUpperCase() });
      if (error) throw error;

      // Sync household_id into local auth store
      const cur = useAuthStore.getState().profile;
      if (cur) useAuthStore.getState().setProfile({ ...cur, household_id: householdId as string });

      // Merge all solo data into the household
      try {
        await supabase.rpc('merge_user_data_into_household', {
          p_user_id: user.id,
          p_household_id: householdId as string,
        });
      } catch {
        // Non-fatal
      }

      return householdId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
      qc.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe_books'] });
      showToast('Joined household!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

/** Rename the current household */
export function useRenameHousehold() {
  const qc = useQueryClient();
  const profile = useProfile();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!profile?.household_id) throw new Error('No household');
      const { error } = await supabase
        .from('households')
        .update({ name: name.trim() })
        .eq('id', profile.household_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOUSEHOLD_KEY] });
      showToast('Household renamed', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });
}
