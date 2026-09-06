import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Copy, Trash2, Calendar, Sparkles, UtensilsCrossed, Tag, X, ArrowLeftRight, BookOpen, RefreshCw, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useProfile } from '../../../lib/hooks/useAuth';
import {
  useMealPlan,
  useMealPlanEntries,
  buildEntryMap,
  useAddMealPlanEntry,
  useRemoveMealPlanEntry,
  useCopyPreviousWeek,
  useClearWeek,
  useGenerateMealPlan,
  useSwapMealPlanSlots,
  useAddMealPlanEntrySide,
  useRemoveMealPlanEntrySide,
  useCarryOverBiweekOverlap,
  MealPlanEntryWithRecipe,
} from '../../../lib/hooks/useMealPlan';
import { SwapMode } from '../../../components/meal-plan/MealSlotRow';
import { useHousehold } from '../../../lib/hooks/useHousehold';
import { useWeekRulesStore, DAY_NAMES } from '../../../lib/stores/weekRulesStore';
import { useSyncDayRulesFromDb } from '../../../lib/hooks/useHouseholdSync';
import { GenerateModal } from '../../../components/meal-plan/GenerateModal';
import { DayRuleSheet } from '../../../components/meal-plan/DayRuleSheet';
import {
  getWeekStart,
  getWeekDates,
  getBiweekDates,
  formatDayLabel,
  formatWeekRange,
  getPreviousWeekStart,
  getNextWeekStart,
  isToday,
  isPast,
} from '../../../lib/utils/dates';
import { MealSlotRow } from '../../../components/meal-plan/MealSlotRow';
import { RecipePickerModal } from '../../../components/meal-plan/RecipePickerModal';
import { MealSlot, Recipe } from '../../../lib/database.types';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

type SlotTarget = { date: string; slot: MealSlot } | null;


const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner'];


export default function PlanScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();
  const { data: household } = useHousehold();

  const [weekStart, setWeekStart] = useState(getWeekStart);
  const [pickerTarget, setPickerTarget] = useState<SlotTarget>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [ruleDay, setRuleDay] = useState<number | null>(null);
  const [swapEntry, setSwapEntry] = useState<MealPlanEntryWithRecipe | null>(null);
  const [entryMenuEntry, setEntryMenuEntry] = useState<MealPlanEntryWithRecipe | null>(null);
  const [sideTarget, setSideTarget] = useState<MealPlanEntryWithRecipe | null>(null);
  const [newSideText, setNewSideText] = useState('');

  // Prefer household preferences so all members see identical plan structure.
  // Fall back to personal prefs for solo users.
  const mealSlotsSetting =
    household?.preferences?.meal_slots ??
    profile?.preferences?.meal_slots ??
    'dinner_only';
  const visibleSlots = useMemo((): MealSlot[] => {
    if (mealSlotsSetting === 'all') return SLOT_ORDER;
    if (mealSlotsSetting === 'lunch_dinner') return ['lunch', 'dinner'];
    return ['dinner'];
  }, [mealSlotsSetting]);

  // Determine whether to show 7 or 14 days
  const planningMode =
    household?.preferences?.planning_mode ??
    profile?.preferences?.planning_mode ??
    'weekly';
  const weekDates = useMemo(
    () => (planningMode === 'biweekly' ? getBiweekDates(weekStart) : getWeekDates(weekStart)),
    [weekStart, planningMode]
  );

  // Resolve week start day: household → user profile → Sunday (0)
  const weekStartDay: number =
    household?.preferences?.week_start_day ??
    profile?.preferences?.week_start_day ??
    0;

  // Re-snap to the correct week boundary when the start day setting changes.
  useEffect(() => {
    setWeekStart(getWeekStart(new Date(), weekStartDay));
  }, [weekStartDay]);

  // Data
  const { data: plan, isLoading: planLoading, refetch: refetchPlan } = useMealPlan(weekStart);
  const {
    data: entries = [],
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useMealPlanEntries(plan?.id);

  const entryMap = useMemo(() => buildEntryMap(entries), [entries]);

  const isLoading = planLoading || entriesLoading;

  const addEntry = useAddMealPlanEntry();
  const removeEntry = useRemoveMealPlanEntry();
  const copyPrevious = useCopyPreviousWeek();
  const clearWeek = useClearWeek();
  const generatePlan = useGenerateMealPlan();
  const swapSlots = useSwapMealPlanSlots();
  const addSide = useAddMealPlanEntrySide();
  const removeSide = useRemoveMealPlanEntrySide();
  const carryOverBiweek = useCarryOverBiweekOverlap();
  /** Track which weekStart values have already had carry-over attempted so we
   *  don't re-trigger after the user manually clears the week. */
  const carryOverAttemptedRef = useRef<Set<string>>(new Set());

  const { rules } = useWeekRulesStore();
  useSyncDayRulesFromDb(); // load from DB and keep household in sync

  // Keep a ref to entryMap so the auto-fill effect always reads the latest value
  // without needing to list it as a dependency (which would create mutation loops).
  const entryMapRef = useRef(entryMap);
  useEffect(() => { entryMapRef.current = entryMap; }, [entryMap]);

  // In biweekly mode, seed blank periods with overlap meals from the predecessor plan.
  // Runs once per weekStart (deduped via ref) to avoid re-triggering after manual clears.
  useEffect(() => {
    if (planningMode !== 'biweekly') return;
    if (planLoading || entriesLoading) return;
    if (entries.length > 0) return;
    if (carryOverAttemptedRef.current.has(weekStart)) return;

    carryOverAttemptedRef.current.add(weekStart);
    carryOverBiweek.mutate(weekStart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningMode, planLoading, entriesLoading, entries.length, weekStart]);

  // Auto-fill fixed meal rules when the plan/week/rules change.
  // We intentionally exclude `isLoading` from deps — using plan?.id as the
  // "data is ready" signal avoids re-running the effect on every background refetch.
  useEffect(() => {
    if (!plan?.id) return;
    const currentEntryMap = entryMapRef.current;

    for (const date of weekDates) {
      const dow = new Date(date + 'T12:00:00').getDay();
      const dayRules = rules[dow];
      if (!dayRules) continue;

      for (const slot of visibleSlots) {
        const rule = dayRules[slot];
        if (!rule || rule.type !== 'fixed' || !rule.fixedMeal) continue;
        if (!currentEntryMap[`${date}|${slot}`]) {
          addEntry.mutate({
            weekStart,
            date,
            slot,
            customMealName: rule.fixedMeal,
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, weekStart, rules]);

  // Navigation
  const goToPreviousWeek = () => setWeekStart((w) => getPreviousWeekStart(w));
  const goToNextWeek = () => setWeekStart((w) => getNextWeekStart(w));
  const goToToday = () => setWeekStart(getWeekStart(new Date(), weekStartDay));

  const isCurrentWeek = weekStart === getWeekStart(new Date(), weekStartDay);

  // Open the picker for a specific slot
  const handleAddSlot = useCallback((date: string, slot: MealSlot) => {
    setPickerTarget({ date, slot });
  }, []);

  // Remove an entry
  const handleRemove = useCallback(
    (entryId: string, mealPlanId: string) => {
      removeEntry.mutate({ entryId, mealPlanId });
    },
    [removeEntry]
  );

  // Enter inline swap mode
  const handleSwapDay = useCallback((entry: MealPlanEntryWithRecipe) => {
    setSwapEntry(entry);
  }, []);

  // Execute the swap when user taps a target day
  const handleSwapSelect = useCallback(
    (targetDate: string, targetEntry: MealPlanEntryWithRecipe | undefined) => {
      if (!swapEntry) return;
      swapSlots.mutate({ sourceEntry: swapEntry, targetDate, targetEntry: targetEntry ?? null });
      setSwapEntry(null);
    },
    [swapEntry, swapSlots]
  );

  // Tapping an existing entry — open custom action menu
  const handleEntryPress = useCallback(
    (entry: MealPlanEntryWithRecipe) => {
      setEntryMenuEntry(entry);
    },
    []
  );

  // Side dish handlers
  const handleOpenAddSide = useCallback((entry: MealPlanEntryWithRecipe) => {
    setSideTarget(entry);
    setNewSideText('');
  }, []);

  const handleConfirmAddSide = useCallback(() => {
    if (!sideTarget || !newSideText.trim()) return;
    addSide.mutate({ entry: sideTarget, newSide: newSideText.trim() });
    setSideTarget(null);
    setNewSideText('');
  }, [sideTarget, newSideText, addSide]);

  const handleRemoveSide = useCallback(
    (entry: MealPlanEntryWithRecipe, sideIndex: number) => {
      removeSide.mutate({ entry, sideIndex });
    },
    [removeSide]
  );

  // Compute per-slot swap mode for each (date, slot) combination
  const getSwapMode = useCallback(
    (date: string, slot: MealSlot, entry: MealPlanEntryWithRecipe | undefined): SwapMode => {
      if (!swapEntry) return null;
      if (entry?.id === swapEntry.id) return 'source';
      if (slot !== swapEntry.meal_slot) return null;
      if (date === swapEntry.date) return null;
      return entry ? 'target' : 'empty-target';
    },
    [swapEntry]
  );

  // Handle recipe selection from modal
  const handleSelectRecipe = useCallback(
    (recipe: Recipe) => {
      if (!pickerTarget) return;
      addEntry.mutate({
        weekStart,
        date: pickerTarget.date,
        slot: pickerTarget.slot,
        recipeId: recipe.id,
      });
      setPickerTarget(null);
    },
    [pickerTarget, weekStart, addEntry]
  );

  // Handle custom meal from modal
  const handleSelectCustom = useCallback(
    (name: string) => {
      if (!pickerTarget) return;
      addEntry.mutate({
        weekStart,
        date: pickerTarget.date,
        slot: pickerTarget.slot,
        customMealName: name,
      });
      setPickerTarget(null);
    },
    [pickerTarget, weekStart, addEntry]
  );

  const handleCopyPrevious = () => {
    const previousWeekStart = getPreviousWeekStart(weekStart);
    copyPrevious.mutate({ currentWeekStart: weekStart, previousWeekStart });
  };

  const handleClearWeek = () => {
    if (!plan) return;
    Alert.alert(
      'Clear week?',
      'This will remove all meals from this week. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearWeek.mutate(plan.id),
        },
      ]
    );
  };

  const handleGenerate = useCallback(
    (overwrite: boolean) => {
      generatePlan.mutate(
        { weekStart, dates: weekDates, slots: visibleSlots, overwriteExisting: overwrite },
        { onSuccess: () => setShowGenerate(false) }
      );
    },
    [weekStart, weekDates, visibleSlots, generatePlan]
  );

  const handleRefresh = () => {
    refetchPlan();
    refetchEntries();
  };

  // Picker date label
  const pickerDateLabel = useMemo(() => {
    if (!pickerTarget) return undefined;
    const { weekday, date } = formatDayLabel(pickerTarget.date);
    return `${weekday}, ${date}`;
  }, [pickerTarget]);

  return (
    <ErrorBoundary>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
          ]}
        >
          Meal Plan
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowGenerate(true)}
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
          >
            <Sparkles size={16} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          {entries.length > 0 && (
            <TouchableOpacity
              onPress={handleClearWeek}
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Trash2 size={16} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleCopyPrevious}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            disabled={copyPrevious.isPending}
          >
            {copyPrevious.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Copy size={16} color={colors.primary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Swap mode banner */}
      {swapEntry && (
        <View style={[styles.swapBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '50' }]}>
          <ArrowLeftRight size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.swapBannerText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]} numberOfLines={1}>
            Tap a {swapEntry.meal_slot} to swap "{swapEntry.recipes?.title ?? swapEntry.custom_meal_name ?? swapEntry.meal_slot}"
          </Text>
          <TouchableOpacity onPress={() => setSwapEntry(null)} hitSlop={8} style={styles.swapBannerClose}>
            <X size={18} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Week navigation */}
      <View
        style={[
          styles.weekNav,
          { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={goToPreviousWeek} hitSlop={8}>
          <ChevronLeft size={22} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.weekLabelBtn}>
          <Text
            style={[
              styles.weekLabel,
              {
                color: colors.textPrimary,
                fontFamily: typography.fontFamilies.sansSemiBold,
              },
            ]}
          >
            {formatWeekRange(weekStart)}
          </Text>
          {!isCurrentWeek && (
            <View style={[styles.todayPill, { backgroundColor: colors.primary + '20' }]}>
              <Calendar size={10} color={colors.primary} strokeWidth={2} />
              <Text
                style={[
                  styles.todayPillText,
                  { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium },
                ]}
              >
                Today
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextWeek} hitSlop={8}>
          <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Days */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: layout.screenPaddingH }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {weekDates.map((date) => {
            const { weekday, date: dateStr } = formatDayLabel(date);
            const today = isToday(date);
            const past = isPast(date);
            const dow = new Date(date + 'T12:00:00').getDay();
            const accentColor = colors.primary;

            return (
              <View key={date} style={styles.daySection}>
                {/* Day header */}
                <View style={styles.dayHeader}>
                  <TouchableOpacity
                    onPress={() => setRuleDay(dow)}
                    activeOpacity={0.85}
                    style={[
                      styles.dayLabelContainer,
                      today
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: accentColor + '18' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayWeekday,
                        {
                          color: today ? '#fff' : past ? colors.textSecondary : accentColor,
                          fontFamily: typography.fontFamilies.sansSemiBold,
                        },
                      ]}
                    >
                      {weekday}
                    </Text>
                    <Text
                      style={[
                        styles.dayDate,
                        {
                          color: today ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansRegular,
                        },
                      ]}
                    >
                      {dateStr}
                    </Text>
                    {/* Rule indicator — right side */}
                    {(() => {
                      const dayRules = rules[dow];
                      const slotRules = dayRules
                        ? visibleSlots.map((s) => dayRules[s]).filter(Boolean)
                        : [];
                      if (slotRules.length === 0) return (
                        <Text style={[styles.ruleChipText, { color: today ? 'rgba(255,255,255,0.55)' : colors.textSecondary, marginLeft: 'auto', fontFamily: typography.fontFamilies.sansRegular }]}>
                          + rule
                        </Text>
                      );
                      if (slotRules.length === 1) {
                        const r = slotRules[0]!;
                        const labelColor = today ? '#fff' : r.type === 'fixed' ? colors.secondary : r.type === 'surpriseMe' ? '#9B59B6' : accentColor;
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 3 }}>
                            {r.type === 'fixed'
                              ? <UtensilsCrossed size={11} color={labelColor} strokeWidth={1.75} />
                              : r.type === 'surpriseMe'
                              ? <Sparkles size={11} color={labelColor} strokeWidth={1.75} />
                              : <Tag size={11} color={labelColor} strokeWidth={1.75} />
                            }
                            <Text style={[styles.ruleChipText, { color: labelColor, fontFamily: typography.fontFamilies.sansMedium }]}>
                              {r.label}
                            </Text>
                          </View>
                        );
                      }
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 3 }}>
                          <Tag size={11} color={today ? '#fff' : accentColor} strokeWidth={1.75} />
                          <Text style={[styles.ruleChipText, { color: today ? '#fff' : accentColor, fontFamily: typography.fontFamilies.sansMedium }]}>
                            {slotRules.length} rules
                          </Text>
                        </View>
                      );
                    })()}
                  </TouchableOpacity>
                </View>

                {/* Meal slots */}
                <View style={past ? styles.pastOpacity : undefined}>
                  {visibleSlots.map((slot) => {
                    const key = `${date}|${slot}`;
                    const entry = entryMap[key];
                    const mode = getSwapMode(date, slot, entry);
                    return (
                      <MealSlotRow
                        key={slot}
                        slot={slot}
                        entry={entry}
                        isPast={past}
                        onAdd={() => handleAddSlot(date, slot)}
                        onRemove={handleRemove}
                        onPress={handleEntryPress}
                        swapMode={mode}
                        onSwapSelect={() => handleSwapSelect(date, entry)}
                        onSwapDay={handleSwapDay}
                        onAddSide={handleOpenAddSide}
                        onRemoveSide={handleRemoveSide}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Empty state hint */}
          {entries.length === 0 && (
            <View style={styles.emptyHint}>
              <Text
                style={[
                  styles.emptyHintText,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamilies.sansRegular,
                  },
                ]}
              >
                Tap the{' '}
                <Text style={{ fontFamily: typography.fontFamilies.sansMedium }}>+</Text> next to
                any meal slot to start planning your week.
              </Text>
              <TouchableOpacity
                onPress={handleCopyPrevious}
                style={styles.copyHint}
                disabled={copyPrevious.isPending}
              >
                <Copy size={13} color={colors.primary} strokeWidth={2} />
                <Text
                  style={[
                    styles.copyHintText,
                    { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium },
                  ]}
                >
                  Copy from last week
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Recipe picker modal */}
      <RecipePickerModal
        visible={!!pickerTarget}
        slot={pickerTarget?.slot ?? null}
        dateLabel={pickerDateLabel}
        onSelectRecipe={handleSelectRecipe}
        onSelectCustom={handleSelectCustom}
        onClose={() => setPickerTarget(null)}
      />

      <GenerateModal
        visible={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerate={handleGenerate}
        isGenerating={generatePlan.isPending}
        hasExistingEntries={entries.length > 0}
      />

      <DayRuleSheet
        visible={ruleDay !== null}
        dayOfWeek={ruleDay}
        slots={visibleSlots}
        onClose={() => setRuleDay(null)}
      />

      {/* Add side dish modal */}
      <Modal
        visible={!!sideTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setSideTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKav}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSideTarget(null)} />
          <View style={[styles.addSideSheet, { backgroundColor: colors.surface, shadowColor: colors.textPrimary }]}>
            <View style={styles.addSideHeader}>
              <Text style={[styles.addSideTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
                Add a Side Dish
              </Text>
              <TouchableOpacity onPress={() => setSideTarget(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {sideTarget && (
              <Text style={[styles.addSideSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                for {sideTarget.recipes?.title ?? sideTarget.custom_meal_name}
              </Text>
            )}
            <View style={[styles.addSideInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                value={newSideText}
                onChangeText={setNewSideText}
                placeholder="e.g. Steamed rice, Garden salad…"
                placeholderTextColor={colors.textSecondary}
                style={[styles.addSideInput, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
                autoFocus
                onSubmitEditing={handleConfirmAddSide}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[styles.addSideConfirmBtn, { backgroundColor: newSideText.trim() ? colors.primary : colors.border }]}
              onPress={handleConfirmAddSide}
              disabled={!newSideText.trim()}
            >
              <Text style={[styles.addSideConfirmText, { fontFamily: typography.fontFamilies.sansMedium }]}>
                Add Side
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Entry action menu modal */}
      <Modal
        visible={!!entryMenuEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setEntryMenuEntry(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEntryMenuEntry(null)} />
        <View style={[styles.entryMenuSheet, { backgroundColor: colors.surface, shadowColor: colors.textPrimary }]}>
          <Text style={[styles.entryMenuTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]} numberOfLines={2}>
            {entryMenuEntry?.recipes?.title ?? entryMenuEntry?.custom_meal_name ?? 'Meal'}
          </Text>
          {entryMenuEntry?.recipes?.id && (
            <TouchableOpacity
              style={[styles.entryMenuBtn, { borderBottomColor: colors.border }]}
              onPress={() => {
                setEntryMenuEntry(null);
                router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: entryMenuEntry!.recipes!.id } });
              }}
            >
              <BookOpen size={18} color={colors.primary} strokeWidth={1.75} />
              <Text style={[styles.entryMenuBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Go to Recipe
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.entryMenuBtn, { borderBottomColor: colors.border }]}
            onPress={() => {
              const entry = entryMenuEntry!;
              setEntryMenuEntry(null);
              handleSwapDay(entry);
            }}
          >
            <ArrowRightLeft size={18} color={colors.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.entryMenuBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Swap Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.entryMenuBtn, { borderBottomColor: colors.border }]}
            onPress={() => {
              const entry = entryMenuEntry!;
              setEntryMenuEntry(null);
              setPickerTarget({ date: entry.date, slot: entry.meal_slot as MealSlot });
            }}
          >
            <RefreshCw size={18} color={colors.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.entryMenuBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Replace
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.entryMenuBtn, { borderBottomColor: colors.border }]}
            onPress={() => {
              const entry = entryMenuEntry!;
              setEntryMenuEntry(null);
              handleRemove(entry.id, entry.meal_plan_id);
            }}
          >
            <Trash2 size={18} color={colors.destructive} strokeWidth={1.75} />
            <Text style={[styles.entryMenuBtnText, { color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium }]}>
              Remove
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.entryMenuCancelBtn, { borderTopColor: colors.border }]}
            onPress={() => setEntryMenuEntry(null)}
          >
            <Text style={[styles.entryMenuCancelText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  weekLabelBtn: {
    alignItems: 'center',
    gap: 4,
  },
  weekLabel: {
    fontSize: 15,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  todayPillText: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 8,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  dayWeekday: {
    fontSize: 14,
  },
  dayDate: {
    fontSize: 13,
  },
  pastOpacity: {
    opacity: 0.55,
  },
  ruleChipText: {
    fontSize: 12,
  },
  emptyHint: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  emptyHintText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyHintText: {
    fontSize: 14,
  },
  swapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  swapBannerText: {
    flex: 1,
    fontSize: 13,
  },
  swapBannerClose: {
    padding: 2,
  },
  // Add side modal
  modalKav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  addSideSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  addSideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addSideTitle: {
    fontSize: 22,
  },
  addSideSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  addSideInputRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  addSideInput: {
    fontSize: 15,
    paddingVertical: 12,
    minHeight: 44,
  },
  addSideConfirmBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addSideConfirmText: {
    color: '#fff',
    fontSize: 15,
  },
  entryMenuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  entryMenuTitle: {
    fontSize: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  entryMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryMenuBtnText: { fontSize: 16 },
  entryMenuCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    alignItems: 'center',
  },
  entryMenuCancelText: { fontSize: 15 },
});
