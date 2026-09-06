import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User,
  Users,
  ChevronRight,
  LogOut,
  BookOpen,
  Tag,
  LayoutGrid,
  Check,
  X,
  Pencil,
  ChefHat,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useProfile } from '../../../lib/hooks/useAuth';
import { useAuthStore } from '../../../lib/stores/authStore';
import {
  usePendingInvites,
  useHousehold,
  useUpdateHouseholdPreferences,
} from '../../../lib/hooks/useHousehold';
import { UserPreferences, HouseholdPreferences } from '../../../lib/database.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// ─── Option picker modal ──────────────────────────────────────────────────────

type OptionItem = { label: string; value: string };

function OptionPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  colors,
  typography,
}: {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  colors: any;
  typography: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.optionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.optionSheetTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            {title}
          </Text>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionRow,
                i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {opt.label}
              </Text>
              {opt.value === selected && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Servings stepper modal ───────────────────────────────────────────────────

function ServingsModal({
  visible,
  value,
  onSave,
  onClose,
  colors,
  typography,
}: {
  visible: boolean;
  value: number;
  onSave: (v: number) => void;
  onClose: () => void;
  colors: any;
  typography: any;
}) {
  const [count, setCount] = useState(value);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.optionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.optionSheetTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            Default Servings
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={() => setCount(Math.max(1, count - 1))}
            >
              <Text style={[styles.stepperBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              {count}
            </Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { borderColor: colors.border }]}
              onPress={() => setCount(Math.min(20, count + 1))}
            >
              <Text style={[styles.stepperBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => { onSave(count); onClose(); }}
          >
            <Text style={[styles.saveBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>Save</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();
  const { signOut, updateProfile } = useAuthStore();
  const { data: pendingInvites = [] } = usePendingInvites();
  const { data: household } = useHousehold();
  const updateHouseholdPrefs = useUpdateHouseholdPreferences();

  // Modal state
  const [showPlanningMode, setShowPlanningMode] = useState(false);
  const [showMealSlots, setShowMealSlots] = useState(false);
  const [showServings, setShowServings] = useState(false);
  const [showWeekStart, setShowWeekStart] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Shared plan settings live on the household when one exists;
  // personal prefs are the fallback for solo users.
  const prefs = {
    planning_mode:
      (household?.preferences?.planning_mode ?? profile?.preferences?.planning_mode ?? 'weekly') as UserPreferences['planning_mode'],
    meal_slots:
      (household?.preferences?.meal_slots ?? profile?.preferences?.meal_slots ?? 'dinner_only') as UserPreferences['meal_slots'],
    default_servings: profile?.preferences?.default_servings ?? 4,
    week_start_day:
      (household?.preferences?.week_start_day ?? profile?.preferences?.week_start_day ?? 0) as NonNullable<UserPreferences['week_start_day']>,
  };

  const handleUpdatePref = (updates: Partial<UserPreferences>) => {
    const { default_servings, ...sharedUpdates } = updates;

    // Use profile?.household_id (not `household`) to decide the save path.
    // `household` can be undefined while React Query is still fetching, which
    // would cause the update to go to the profile even for household members,
    // and then be overwritten when the household data loads.
    if (profile?.household_id && Object.keys(sharedUpdates).length > 0) {
      // planning_mode + meal_slots → household (shared with all members)
      updateHouseholdPrefs.mutate(sharedUpdates as Partial<HouseholdPreferences>);
    } else if (!profile?.household_id && Object.keys(sharedUpdates).length > 0) {
      // Solo user — write to personal prefs
      updateProfile({ preferences: { ...prefs, ...sharedUpdates } });
    }

    if (default_servings !== undefined) {
      // Always personal — servings is per-user, not shared
      updateProfile({ preferences: { ...prefs, default_servings } });
    }
  };

  const handleSaveName = async () => {
    const name = editNameValue.trim();
    if (!name) return;
    setSavingName(true);
    await updateProfile({ display_name: name });
    setSavingName(false);
    setShowEditName(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = profile?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const planningModeLabel = prefs.planning_mode === 'biweekly' ? 'Bi-weekly' : 'Weekly';
  const mealSlotsLabel =
    prefs.meal_slots === 'all'
      ? 'Breakfast, Lunch & Dinner'
      : prefs.meal_slots === 'lunch_dinner'
      ? 'Lunch & Dinner'
      : 'Dinner only';
  const weekStartLabel = DAY_LABELS[prefs.week_start_day];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Settings
          </Text>
        </View>

        {/* Profile card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, marginHorizontal: layout.screenPaddingH }]}
          onPress={() => {
            setEditNameValue(profile?.display_name ?? '');
            setShowEditName(true);
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { fontFamily: typography.fontFamilies.sansBold }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
              {profile?.display_name ?? 'Your Name'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              {profile?.email ?? ''}
            </Text>
          </View>
          <Pencil size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        {/* Account */}
        <SectionLabel label="ACCOUNT" colors={colors} typography={typography} layout={layout} />
        <View style={[styles.group, { marginHorizontal: layout.screenPaddingH, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={<Users color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Household"
            value={profile?.household_id ? 'View' : 'Set up'}
            badge={pendingInvites.length > 0 ? pendingInvites.length : undefined}
            colors={colors}
            typography={typography}
            showChevron
            onPress={() => router.push('/(tabs)/settings/household')}
          />
        </View>

        {/* Preferences */}
        <SectionLabel label="PLANNING PREFERENCES" colors={colors} typography={typography} layout={layout} />
        <View style={[styles.group, { marginHorizontal: layout.screenPaddingH, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={<BookOpen color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Planning mode"
            value={planningModeLabel}
            colors={colors}
            typography={typography}
            showChevron
            divider
            onPress={() => setShowPlanningMode(true)}
          />
          <SettingsRow
            icon={<LayoutGrid color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Meal slots"
            value={mealSlotsLabel}
            colors={colors}
            typography={typography}
            showChevron
            divider
            onPress={() => setShowMealSlots(true)}
          />
          <SettingsRow
            icon={<ChefHat color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Default servings"
            value={String(prefs.default_servings)}
            colors={colors}
            typography={typography}
            showChevron
            divider
            onPress={() => setShowServings(true)}
          />
          <SettingsRow
            icon={<Calendar color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Week starts on"
            value={weekStartLabel}
            colors={colors}
            typography={typography}
            showChevron
            onPress={() => setShowWeekStart(true)}
          />
        </View>

        {/* Library */}
        <SectionLabel label="RECIPE LIBRARY" colors={colors} typography={typography} layout={layout} />
        <View style={[styles.group, { marginHorizontal: layout.screenPaddingH, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={<Tag color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Manage Categories"
            colors={colors}
            typography={typography}
            showChevron
            divider
            onPress={() => router.push('/(tabs)/settings/categories')}
          />
          <SettingsRow
            icon={<Tag color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Manage Tags"
            colors={colors}
            typography={typography}
            showChevron
            onPress={() => router.push('/(tabs)/settings/tags')}
          />
        </View>

        {/* Sign out */}
        <View style={[styles.group, { marginHorizontal: layout.screenPaddingH, marginTop: 24, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <LogOut color={colors.destructive} size={18} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: colors.destructive, fontFamily: typography.fontFamilies.sansRegular }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
          Simmer Down v1.0.0
        </Text>
      </ScrollView>

      {/* ── Modals ─────────────────────────────────────────────── */}

      <OptionPickerModal
        visible={showPlanningMode}
        title="Planning Mode"
        options={[
          { label: 'Weekly (7 days)', value: 'weekly' },
          { label: 'Bi-weekly (14 days)', value: 'biweekly' },
        ]}
        selected={prefs.planning_mode}
        onSelect={(v) => handleUpdatePref({ planning_mode: v as UserPreferences['planning_mode'] })}
        onClose={() => setShowPlanningMode(false)}
        colors={colors}
        typography={typography}
      />

      <OptionPickerModal
        visible={showMealSlots}
        title="Meal Slots"
        options={[
          { label: 'Dinner only', value: 'dinner_only' },
          { label: 'Lunch & Dinner', value: 'lunch_dinner' },
          { label: 'Breakfast, Lunch & Dinner', value: 'all' },
        ]}
        selected={prefs.meal_slots}
        onSelect={(v) => handleUpdatePref({ meal_slots: v as UserPreferences['meal_slots'] })}
        onClose={() => setShowMealSlots(false)}
        colors={colors}
        typography={typography}
      />

      <ServingsModal
        visible={showServings}
        value={prefs.default_servings}
        onSave={(v) => handleUpdatePref({ default_servings: v })}
        onClose={() => setShowServings(false)}
        colors={colors}
        typography={typography}
      />

      <OptionPickerModal
        visible={showWeekStart}
        title="Week Starts On"
        options={[
          { label: 'Sunday', value: '0' },
          { label: 'Monday', value: '1' },
          { label: 'Tuesday', value: '2' },
          { label: 'Wednesday', value: '3' },
          { label: 'Thursday', value: '4' },
          { label: 'Friday', value: '5' },
          { label: 'Saturday', value: '6' },
        ]}
        selected={String(prefs.week_start_day)}
        onSelect={(v) => {
          const day = parseInt(v, 10);
          if (day >= 0 && day <= 6) {
            handleUpdatePref({ week_start_day: day as NonNullable<UserPreferences['week_start_day']> });
          }
        }}
        onClose={() => setShowWeekStart(false)}
        colors={colors}
        typography={typography}
      />

      {/* Edit display name modal */}
      <Modal visible={showEditName} transparent animationType="fade" onRequestClose={() => setShowEditName(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditName(false)}>
          <View style={[styles.optionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.editNameHeader}>
              <Text style={[styles.optionSheetTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Edit Name
              </Text>
              <TouchableOpacity onPress={() => setShowEditName(false)} hitSlop={8}>
                <X size={18} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, fontFamily: typography.fontFamilies.sansRegular }]}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Your name"
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: editNameValue.trim() ? colors.primary : colors.border }]}
              onPress={handleSaveName}
              disabled={!editNameValue.trim() || savingName}
            >
              {savingName ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.saveBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, colors, typography, layout }: any) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold, marginHorizontal: layout.screenPaddingH }]}>
      {label}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  badge,
  colors,
  typography,
  showChevron,
  divider,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: number;
  colors: any;
  typography: any;
  showChevron?: boolean;
  divider?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.rowLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}>
        {label}
      </Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>{badge}</Text>
        </View>
      ) : null}
      {value ? <Text style={[styles.rowValue, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>{value}</Text> : null}
      {showChevron ? <ChevronRight color={colors.textSecondary} size={16} strokeWidth={2} /> : null}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 30 },
  profileCard: {
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20 },
  profileName: { fontSize: 17 },
  profileEmail: { fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 24,
  },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 14 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11 },
  version: { textAlign: 'center', fontSize: 13, marginTop: 24, marginBottom: 40 },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  optionSheet: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionSheetTitle: {
    fontSize: 15,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionLabel: { flex: 1, fontSize: 15 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 32,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 22 },
  stepperValue: { fontSize: 40, minWidth: 56, textAlign: 'center' },
  saveBtn: {
    margin: 16,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15 },
  editNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  nameInput: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
});
