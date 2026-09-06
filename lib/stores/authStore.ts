import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Profile } from '../database.types';
import { useUIStore } from './uiStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, initialized: true });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, loading: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error?.code === 'PGRST116') {
      // No profile row — create one now (handle_new_user trigger may have missed this user)
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, email: user.email ?? '' })
        .select()
        .single();
      if (newProfile) set({ profile: newProfile });
      return;
    }

    if (data) {
      set({ profile: data });
    }
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    // Optimistic update — apply immediately so UI feels instant
    const previousProfile = profile;
    set({ profile: { ...profile, ...updates } as Profile });

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      set({ profile: previousProfile });
      useUIStore.getState().showToast(`Save failed: ${error.message}`, 'error');
      throw error;
    }

    if (data) {
      set({ profile: data });
    }
  },
}));
