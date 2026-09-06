import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { copyToClipboard, shareText } from '../../../lib/utils/webCompat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Mail,
  Check,
  X,
  LogOut,
  Home,
  Clock,
  Copy,
  RefreshCw,
  Hash,
  Pencil,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useProfile } from '../../../lib/hooks/useAuth';
import {
  useHousehold,
  useHouseholdMembers,
  useSentInvites,
  usePendingInvites,
  useCreateHousehold,
  useInviteMember,
  useAcceptInvite,
  useDeclineInvite,
  useCancelInvite,
  useLeaveHousehold,
  useRegenerateInviteCode,
  useJoinByCode,
  useRenameHousehold,
} from '../../../lib/hooks/useHousehold';

export default function HouseholdScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();

  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: sentInvites = [] } = useSentInvites();
  const { data: pendingInvites = [] } = usePendingInvites();

  const createHousehold = useCreateHousehold();
  const inviteMember = useInviteMember();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();
  const cancelInvite = useCancelInvite();
  const leaveHousehold = useLeaveHousehold();
  const regenerateCode = useRegenerateInviteCode();
  const joinByCode = useJoinByCode();
  const renameHousehold = useRenameHousehold();

  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [editHouseholdNameValue, setEditHouseholdNameValue] = useState('');

  const handleCopyCode = () => {
    const code = household?.invite_code;
    if (!code) return;
    copyToClipboard(code);
  };

  const handleShareCode = () => {
    const code = household?.invite_code;
    if (!code) return;
    shareText(`Join my Simmer Down household! Open the app → Settings → Household → Join with Code → enter: ${code}`);
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Regenerate code?',
      'The current code will stop working immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: () => regenerateCode.mutate() },
      ]
    );
  };

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) return;
    joinByCode.mutate(code, { onSuccess: () => setJoinCode('') });
  };

  const hasHousehold = !!profile?.household_id;

  const handleRenameHousehold = () => {
    const name = editHouseholdNameValue.trim();
    if (!name) return;
    renameHousehold.mutate(name, {
      onSuccess: () => setEditingHouseholdName(false),
    });
  };

  const startEditHouseholdName = () => {
    setEditHouseholdNameValue(household?.name ?? '');
    setEditingHouseholdName(true);
  };

  const handleCreate = () => {
    const name = householdName.trim();
    if (!name) return;
    createHousehold.mutate(name, { onSuccess: () => setHouseholdName('') });
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    inviteMember.mutate(email, { onSuccess: () => setInviteEmail('') });
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave household?',
      'You\'ll lose access to shared recipes and meal plans. You can rejoin with a new invite.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveHousehold.mutate() },
      ]
    );
  };

  const s = styles(colors, typography, layout);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Household</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Pending invites for ME ───────────────────────────── */}
        {pendingInvites.length > 0 && (
          <>
            <Text style={s.sectionLabel}>INVITES FOR YOU</Text>
            <View style={s.group}>
              {pendingInvites.map((inv, i) => (
                <View
                  key={inv.id}
                  style={[s.row, i < pendingInvites.length - 1 && s.divider]}
                >
                  <Home size={18} color={colors.primary} strokeWidth={1.5} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>
                      {inv.households?.name ?? 'A household'}
                    </Text>
                    <Text style={s.rowSub}>Invited to join</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => acceptInvite.mutate({ inviteId: inv.id, householdId: inv.household_id })}
                    disabled={acceptInvite.isPending}
                  >
                    {acceptInvite.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Check size={14} color="#fff" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.border }]}
                    onPress={() => declineInvite.mutate(inv.id)}
                    disabled={declineInvite.isPending}
                  >
                    <X size={14} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {!hasHousehold ? (
          /* ── No household yet ───────────────────────────────── */
          <>
            <View style={s.emptyState}>
              <Users size={48} color={colors.textSecondary} strokeWidth={1} />
              <Text style={s.emptyTitle}>Cook together</Text>
              <Text style={s.emptySub}>
                Create a household to share recipes, meal plans, and grocery lists with your family or partner in real time.
              </Text>
            </View>

            <Text style={s.sectionLabel}>JOIN WITH A CODE</Text>
            <View style={s.group}>
              <View style={s.inputRow}>
                <Hash size={16} color={colors.placeholder} strokeWidth={2} />
                <TextInput
                  style={[s.input, { flex: 1, letterSpacing: 3, textTransform: 'uppercase' }]}
                  placeholder="Enter 6-character code"
                  placeholderTextColor={colors.placeholder}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  autoCapitalize="characters"
                  returnKeyType="go"
                  onSubmitEditing={handleJoinByCode}
                />
                <TouchableOpacity
                  style={[s.sendBtn, { backgroundColor: joinCode.length === 6 && !joinByCode.isPending ? colors.primary : colors.border }]}
                  onPress={handleJoinByCode}
                  disabled={joinCode.length < 6 || joinByCode.isPending}
                >
                  {joinByCode.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Check size={16} color="#fff" strokeWidth={2.5} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.sectionLabel}>CREATE A HOUSEHOLD</Text>
            <View style={s.group}>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  placeholder="e.g. The Smith Family"
                  placeholderTextColor={colors.placeholder}
                  value={householdName}
                  onChangeText={setHouseholdName}
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
              </View>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: householdName.trim() ? colors.primary : colors.border }]}
                onPress={handleCreate}
                disabled={!householdName.trim() || createHousehold.isPending}
              >
                {createHousehold.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.createBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                    Create Household
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ── Has a household ────────────────────────────────── */
          <>
            {/* Household name */}
            <Text style={s.sectionLabel}>YOUR HOUSEHOLD</Text>
            <View style={s.group}>
              {editingHouseholdName ? (
                <View style={s.inputRow}>
                  <Home size={18} color={colors.primary} strokeWidth={1.5} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={editHouseholdNameValue}
                    onChangeText={setEditHouseholdNameValue}
                    returnKeyType="done"
                    onSubmitEditing={handleRenameHousehold}
                    autoFocus
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={[s.sendBtn, { backgroundColor: editHouseholdNameValue.trim() ? colors.primary : colors.border }]}
                    onPress={handleRenameHousehold}
                    disabled={!editHouseholdNameValue.trim() || renameHousehold.isPending}
                  >
                    {renameHousehold.isPending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Check size={16} color="#fff" strokeWidth={2.5} />
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sendBtn, { backgroundColor: colors.border }]}
                    onPress={() => setEditingHouseholdName(false)}
                  >
                    <X size={16} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.row}>
                  <Home size={18} color={colors.primary} strokeWidth={1.5} />
                  <Text style={s.rowLabel}>{household?.name ?? 'Your Household'}</Text>
                  <TouchableOpacity onPress={startEditHouseholdName} hitSlop={8}>
                    <Pencil size={16} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Members */}
            <Text style={s.sectionLabel}>MEMBERS</Text>
            <View style={s.group}>
              {members.map((member, i) => {
                const initials = member.display_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) ?? '?';
                const isMe = member.user_id === profile?.user_id;
                return (
                  <View key={member.user_id} style={[s.row, i < members.length - 1 && s.divider]}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowLabel}>
                        {member.display_name ?? 'Member'}{isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={s.rowSub}>{member.email}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Invite code */}
            <Text style={s.sectionLabel}>INVITE CODE</Text>
            <View style={s.group}>
              {household?.invite_code ? (
                <>
                  <View style={s.codeRow}>
                    <Text style={s.codeText}>{household.invite_code}</Text>
                    <TouchableOpacity style={s.codeBtn} onPress={handleCopyCode} hitSlop={8}>
                      <Copy size={16} color={colors.primary} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.codeBtn, { backgroundColor: colors.primary }]}
                      onPress={handleShareCode}
                    >
                      <Text style={[s.codeBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[s.row, s.divider]}>
                    <Text style={[s.rowSub, { flex: 1 }]}>
                      Share this code so others can join without needing their email
                    </Text>
                    <TouchableOpacity onPress={handleRegenerateCode} hitSlop={8} disabled={regenerateCode.isPending}>
                      {regenerateCode.isPending
                        ? <ActivityIndicator size="small" color={colors.textSecondary} />
                        : <RefreshCw size={15} color={colors.textSecondary} strokeWidth={2} />
                      }
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={s.row}
                  onPress={() => regenerateCode.mutate()}
                  disabled={regenerateCode.isPending}
                >
                  {regenerateCode.isPending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Hash size={18} color={colors.primary} strokeWidth={1.5} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowLabel, { color: colors.primary }]}>Generate invite code</Text>
                    <Text style={s.rowSub}>Tap to create a code others can use to join</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Invite by email */}
            <Text style={s.sectionLabel}>INVITE BY EMAIL</Text>
            <View style={s.group}>
              <View style={s.inputRow}>
                <Mail size={16} color={colors.placeholder} strokeWidth={2} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.placeholder}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={handleInvite}
                />
                <TouchableOpacity
                  style={[s.sendBtn, { backgroundColor: inviteEmail.trim() ? colors.primary : colors.border }]}
                  onPress={handleInvite}
                  disabled={!inviteEmail.trim() || inviteMember.isPending}
                >
                  {inviteMember.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <UserPlus size={16} color="#fff" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Pending sent invites */}
              {sentInvites.length > 0 && (
                <>
                  {sentInvites.map((inv) => (
                    <View key={inv.id} style={[s.row, s.divider]}>
                      <Clock size={15} color={colors.textSecondary} strokeWidth={1.5} />
                      <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
                        {inv.invited_email}
                      </Text>
                      <Text style={[s.rowSub, { marginRight: 4 }]}>Pending</Text>
                      <TouchableOpacity onPress={() => cancelInvite.mutate(inv.id)} hitSlop={8}>
                        <X size={14} color={colors.textSecondary} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Leave */}
            <View style={[s.group, { marginTop: 24 }]}>
              <TouchableOpacity style={s.row} onPress={handleLeave} disabled={leaveHousehold.isPending}>
                <LogOut size={18} color={colors.destructive} strokeWidth={1.5} />
                <Text style={[s.rowLabel, { color: colors.destructive }]}>Leave Household</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any, typography: any, layout: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: layout.screenPaddingH,
      paddingTop: 12,
      paddingBottom: 16,
    },
    title: {
      fontSize: 18,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilies.sansSemiBold,
    },
    scroll: { paddingBottom: 40 },
    sectionLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: typography.fontFamilies.sansSemiBold,
      letterSpacing: 1.5,
      marginHorizontal: layout.screenPaddingH,
      marginBottom: 8,
      marginTop: 24,
    },
    group: {
      marginHorizontal: layout.screenPaddingH,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilies.sansRegular,
    },
    rowSub: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: typography.fontFamilies.sansRegular,
      marginTop: 1,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 13,
      color: colors.primary,
      fontFamily: typography.fontFamilies.sansSemiBold,
    },
    actionBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
    },
    input: {
      fontSize: 15,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilies.sansRegular,
      flex: 1,
      padding: 0,
    },
    sendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createBtn: {
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    createBtnText: {
      color: '#fff',
      fontSize: 15,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
    },
    codeText: {
      flex: 1,
      fontSize: 28,
      letterSpacing: 6,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilies.sansBold,
    },
    codeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeBtnText: {
      color: '#fff',
      fontSize: 14,
    },
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 20,
      paddingBottom: 8,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 20,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilies.serifDisplay,
    },
    emptySub: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: typography.fontFamilies.sansRegular,
      textAlign: 'center',
      lineHeight: 20,
    },
    destructiveText: {
      color: colors.destructive,
    },
  });
