import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { UtensilsCrossed, Tag, Sparkles, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useWeekRulesStore, DAY_NAMES, DayRule } from '../../lib/stores/weekRulesStore';
import { useCategories, useTags } from '../../lib/hooks/useRecipes';
import { useRecipeBooks } from '../../lib/hooks/useRecipeBooks';
import { useUpsertDayRule, useDeleteDayRule } from '../../lib/hooks/useHouseholdSync';
import { MealSlot } from '../../lib/database.types';

const SURPRISE_COLOR = '#9B59B6';
const BOOK_COLOR = '#2C7A4B';

type RuleType = 'category' | 'fixed' | 'surpriseMe' | 'recipeBook';

type Props = {
  visible: boolean;
  dayOfWeek: number | null;
  slots: MealSlot[];
  onClose: () => void;
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const COOK_TIME_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: 'Any time', value: undefined },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
  { label: 'Under 60 min', value: 60 },
];


export function DayRuleSheet({ visible, dayOfWeek, slots, onClose }: Props) {
  const { colors, typography } = useTheme();
  const { rules, setSlotRule, clearSlotRule, clearDayRules } = useWeekRulesStore();
  const { data: categoriesData } = useCategories();
  const { data: tagsData } = useTags();
  const { data: booksData } = useRecipeBooks();
  const upsertDayRule = useUpsertDayRule();
  const deleteDayRule = useDeleteDayRule();

  const dayRules = dayOfWeek !== null ? (rules[dayOfWeek] ?? {}) : {};

  const [activeSlot, setActiveSlot] = useState<MealSlot>(slots[0] ?? 'dinner');
  const [ruleType, setRuleType] = useState<RuleType>('category');
  const [fixedMeal, setFixedMeal] = useState('');
  const [label, setLabel] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxCookTime, setMaxCookTime] = useState<number | undefined>(undefined);
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>(undefined);
  const [selectedBookName, setSelectedBookName] = useState<string | undefined>(undefined);

  // Sync local state when slot or visibility changes
  useEffect(() => {
    if (!visible || dayOfWeek === null) return;
    // Default to first slot that has a rule, otherwise first slot
    const slotWithRule = slots.find((s) => !!dayRules[s]);
    const slot = slotWithRule ?? slots[0] ?? 'dinner';
    setActiveSlot(slot);
    loadSlotState(slot);
  }, [visible, dayOfWeek]);

  // Reload state when active slot changes
  useEffect(() => {
    if (!visible) return;
    loadSlotState(activeSlot);
  }, [activeSlot]);

  function loadSlotState(slot: MealSlot) {
    const rule = dayOfWeek !== null ? rules[dayOfWeek]?.[slot] : undefined;
    setRuleType(rule?.type ?? 'category');
    setFixedMeal(rule?.fixedMeal ?? '');
    setLabel(rule?.label ?? '');
    setSelectedCategories(rule?.categories ?? []);
    setSelectedTags(rule?.tags ?? []);
    setMaxCookTime(rule?.maxCookTime);
    setSelectedBookId(rule?.bookId);
    setSelectedBookName(rule?.bookName);
  }

  const toggleCategory = (name: string) =>
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );

  const toggleTag = (name: string) =>
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );

  const handleSave = () => {
    if (dayOfWeek === null) return;
    let rule: DayRule | null = null;
    if (ruleType === 'fixed') {
      if (!fixedMeal.trim()) return;
      rule = { type: 'fixed', label: fixedMeal.trim(), fixedMeal: fixedMeal.trim(), categories: [], tags: [] };
    } else if (ruleType === 'surpriseMe') {
      rule = { type: 'surpriseMe', label: 'Surprise Me', categories: [], tags: [] };
    } else if (ruleType === 'recipeBook') {
      if (!selectedBookId) return;
      rule = { type: 'recipeBook', label: selectedBookName ?? 'Recipe Book', categories: [], tags: [], bookId: selectedBookId, bookName: selectedBookName };
    } else {
      rule = {
        type: 'category',
        label: label.trim() || selectedCategories[0] || 'Custom',
        categories: selectedCategories,
        tags: selectedTags,
        maxCookTime,
      };
    }
    if (rule) {
      setSlotRule(dayOfWeek, activeSlot, rule);
      upsertDayRule.mutate({ dayOfWeek, slot: activeSlot, rule }); // persist to DB
    }
    onClose();
  };

  const handleClearSlot = () => {
    if (dayOfWeek === null) return;
    clearSlotRule(dayOfWeek, activeSlot);
    deleteDayRule.mutate({ dayOfWeek, slot: activeSlot }); // remove from DB
    loadSlotState(activeSlot);
  };

  const handleClearAll = () => {
    if (dayOfWeek === null) return;
    clearDayRules(dayOfWeek);
    deleteDayRule.mutate({ dayOfWeek }); // remove all slots for this day from DB
    onClose();
  };

  const dayName = dayOfWeek !== null ? DAY_NAMES[dayOfWeek] : '';
  const existingSlotRule = dayOfWeek !== null ? rules[dayOfWeek]?.[activeSlot] : undefined;
  const hasAnyRule = Object.keys(dayRules).length > 0;

  const tags: { id: string; name: string }[] = (tagsData as any[]) ?? [];
  const categories: { id: string; name: string; icon?: string | null }[] =
    (categoriesData as any[]) ?? [];

  const canSave =
    ruleType === 'fixed' ? fixedMeal.trim().length > 0 :
    ruleType === 'surpriseMe' ? true :
    ruleType === 'recipeBook' ? !!selectedBookId :
    selectedCategories.length > 0 || selectedTags.length > 0 || maxCookTime !== undefined;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop — flex:1 sibling above sheet; tapping closes without overlapping sheet */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
              ]}
            >
              {dayName} Rules
            </Text>

            {/* Slot tabs — only show if more than one slot is visible */}
            {slots.length > 1 && (
              <View style={[styles.slotTabs, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                {slots.map((slot) => {
                  const active = activeSlot === slot;
                  const hasRule = !!dayRules[slot];
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotTab,
                        active && { backgroundColor: colors.surface },
                      ]}
                      onPress={() => setActiveSlot(slot)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.slotTabText,
                          {
                            color: active ? colors.textPrimary : colors.textSecondary,
                            fontFamily: active
                              ? typography.fontFamilies.sansSemiBold
                              : typography.fontFamilies.sansRegular,
                          },
                        ]}
                      >
                        {SLOT_LABELS[slot]}
                      </Text>
                      {hasRule && (
                        <View style={[styles.slotDot, { backgroundColor: colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Type selector */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    borderColor: ruleType === 'category' ? colors.primary : colors.border,
                    backgroundColor:
                      ruleType === 'category' ? colors.primary + '10' : colors.inputBackground,
                  },
                ]}
                onPress={() => setRuleType('category')}
                activeOpacity={0.8}
              >
                <Tag size={22} color={ruleType === 'category' ? colors.primary : colors.textSecondary} strokeWidth={1.75} />
                <Text
                  style={[
                    styles.typeCardTitle,
                    {
                      color: ruleType === 'category' ? colors.primary : colors.textPrimary,
                      fontFamily: typography.fontFamilies.sansSemiBold,
                    },
                  ]}
                >
                  Category Filter
                </Text>
                <Text
                  style={[
                    styles.typeCardSub,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Pick recipes by category, tag, or cook time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    borderColor: ruleType === 'fixed' ? colors.secondary : colors.border,
                    backgroundColor:
                      ruleType === 'fixed' ? colors.secondary + '10' : colors.inputBackground,
                  },
                ]}
                onPress={() => setRuleType('fixed')}
                activeOpacity={0.8}
              >
                <UtensilsCrossed size={22} color={ruleType === 'fixed' ? colors.secondary : colors.textSecondary} strokeWidth={1.75} />
                <Text
                  style={[
                    styles.typeCardTitle,
                    {
                      color: ruleType === 'fixed' ? colors.secondary : colors.textPrimary,
                      fontFamily: typography.fontFamilies.sansSemiBold,
                    },
                  ]}
                >
                  Fixed Meal
                </Text>
                <Text
                  style={[
                    styles.typeCardSub,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Always the same recurring meal every week
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    borderColor: ruleType === 'surpriseMe' ? SURPRISE_COLOR : colors.border,
                    backgroundColor:
                      ruleType === 'surpriseMe' ? SURPRISE_COLOR + '10' : colors.inputBackground,
                  },
                ]}
                onPress={() => setRuleType('surpriseMe')}
                activeOpacity={0.8}
              >
                <Sparkles size={22} color={ruleType === 'surpriseMe' ? SURPRISE_COLOR : colors.textSecondary} strokeWidth={1.75} />
                <Text
                  style={[
                    styles.typeCardTitle,
                    {
                      color: ruleType === 'surpriseMe' ? SURPRISE_COLOR : colors.textPrimary,
                      fontFamily: typography.fontFamilies.sansSemiBold,
                    },
                  ]}
                >
                  Surprise Me
                </Text>
                <Text
                  style={[
                    styles.typeCardSub,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Pick from Simmer Down Favorites
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  {
                    borderColor: ruleType === 'recipeBook' ? BOOK_COLOR : colors.border,
                    backgroundColor:
                      ruleType === 'recipeBook' ? BOOK_COLOR + '10' : colors.inputBackground,
                  },
                ]}
                onPress={() => setRuleType('recipeBook')}
                activeOpacity={0.8}
              >
                <BookOpen size={22} color={ruleType === 'recipeBook' ? BOOK_COLOR : colors.textSecondary} strokeWidth={1.75} />
                <Text
                  style={[
                    styles.typeCardTitle,
                    {
                      color: ruleType === 'recipeBook' ? BOOK_COLOR : colors.textPrimary,
                      fontFamily: typography.fontFamilies.sansSemiBold,
                    },
                  ]}
                >
                  Recipe Book
                </Text>
                <Text
                  style={[
                    styles.typeCardSub,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Pick from a specific book
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.scrollContent}
            >
              {/* ── Surprise Me mode ── */}
              {ruleType === 'surpriseMe' ? (
                <View style={styles.surpriseBox}>
                  <Sparkles size={32} color={SURPRISE_COLOR} strokeWidth={1.5} />
                  <Text style={[styles.surpriseTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                    Surprise Me
                  </Text>
                  <Text style={[styles.surpriseSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    The meal planner will randomly pick from your{' '}
                    <Text style={{ color: SURPRISE_COLOR, fontFamily: typography.fontFamilies.sansMedium }}>
                      Simmer Down Favorites
                    </Text>{' '}
                    recipe book for this slot.
                  </Text>
                </View>
              ) : ruleType === 'recipeBook' ? (
                /* ── Recipe Book mode ── */
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    Choose a recipe book
                  </Text>
                  {(booksData ?? []).map((book) => {
                    const selected = selectedBookId === book.id;
                    return (
                      <TouchableOpacity
                        key={book.id}
                        onPress={() => { setSelectedBookId(book.id); setSelectedBookName(book.name); }}
                        style={[
                          styles.bookRow,
                          {
                            backgroundColor: selected ? BOOK_COLOR + '12' : colors.inputBackground,
                            borderColor: selected ? BOOK_COLOR : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <BookOpen size={18} color={selected ? BOOK_COLOR : colors.textSecondary} strokeWidth={1.75} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bookRowTitle, { color: selected ? BOOK_COLOR : colors.textPrimary, fontFamily: selected ? typography.fontFamilies.sansSemiBold : typography.fontFamilies.sansRegular }]}>
                            {book.name}
                          </Text>
                          <Text style={[styles.bookRowSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                            {book.recipe_count} {book.recipe_count === 1 ? 'recipe' : 'recipes'}
                          </Text>
                        </View>
                        {selected && (
                          <View style={[styles.bookCheck, { backgroundColor: BOOK_COLOR }]}>
                            <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : ruleType === 'fixed' ? (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    What's this meal?
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.secondary,
                        color: colors.textPrimary,
                        fontFamily: typography.fontFamilies.sansRegular,
                      },
                    ]}
                    placeholder="e.g. Pizza, Leftovers, Takeout"
                    placeholderTextColor={colors.placeholder}
                    value={fixedMeal}
                    onChangeText={setFixedMeal}
                    returnKeyType="done"
                    autoFocus={false}
                    selectTextOnFocus={false}
                  />
                  <Text
                    style={[
                      styles.helpText,
                      { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                    ]}
                  >
                    Every {dayName}'s {SLOT_LABELS[activeSlot].toLowerCase()} will be set to this automatically.
                  </Text>
                </>
              ) : (
                /* ── Category filter mode ── */
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    Rule name (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        fontFamily: typography.fontFamilies.sansRegular,
                      },
                    ]}
                    placeholder={`e.g. Vegetarian ${dayName}`}
                    placeholderTextColor={colors.placeholder}
                    value={label}
                    onChangeText={setLabel}
                    returnKeyType="done"
                    selectTextOnFocus={false}
                  />

                  {categories.length > 0 && (
                    <>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                        ]}
                      >
                        Categories
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsRow}
                      >
                        {categories.map((cat) => {
                          const selected = selectedCategories.includes(cat.name);
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              onPress={() => toggleCategory(cat.name)}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: selected ? colors.primary + '18' : colors.inputBackground,
                                  borderColor: selected ? colors.primary : colors.border,
                                },
                              ]}
                              activeOpacity={0.7}
                            >
                              {cat.icon ? <Text style={styles.chipIcon}>{cat.icon}</Text> : null}
                              <Text
                                style={[
                                  styles.chipText,
                                  {
                                    color: selected ? colors.primary : colors.textPrimary,
                                    fontFamily: selected
                                      ? typography.fontFamilies.sansMedium
                                      : typography.fontFamilies.sansRegular,
                                  },
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}

                  {tags.length > 0 && (
                    <>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                        ]}
                      >
                        Tags
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsRow}
                      >
                        {tags.map((tag) => {
                          const selected = selectedTags.includes(tag.name);
                          return (
                            <TouchableOpacity
                              key={tag.id}
                              onPress={() => toggleTag(tag.name)}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: selected ? colors.secondary + '18' : colors.inputBackground,
                                  borderColor: selected ? colors.secondary : colors.border,
                                },
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  {
                                    color: selected ? colors.secondary : colors.textPrimary,
                                    fontFamily: selected
                                      ? typography.fontFamilies.sansMedium
                                      : typography.fontFamilies.sansRegular,
                                  },
                                ]}
                              >
                                {tag.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}

                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    Max cook time
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    {COOK_TIME_OPTIONS.map((opt) => {
                      const selected = maxCookTime === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          onPress={() => setMaxCookTime(opt.value)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? colors.primary + '18' : colors.inputBackground,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: selected ? colors.primary : colors.textPrimary,
                                fontFamily: selected
                                  ? typography.fontFamilies.sansMedium
                                  : typography.fontFamilies.sansRegular,
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
              {/* Actions — inside scroll so keyboard never pushes them over the content */}
              <View style={[styles.actions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border }]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
              >
                <Text style={[styles.saveBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  Save {SLOT_LABELS[activeSlot]} Rule
                </Text>
              </TouchableOpacity>

              {existingSlotRule && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: colors.destructive }]}
                  onPress={handleClearSlot}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.clearBtnText,
                      { color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    Clear {SLOT_LABELS[activeSlot]} Rule
                  </Text>
                </TouchableOpacity>
              )}

              {hasAnyRule && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: colors.border }]}
                  onPress={handleClearAll}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.clearBtnText,
                      { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    Clear All {DAY_NAMES[dayOfWeek ?? 0]} Rules
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text
                  style={[
                    styles.cancelText,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, marginBottom: 16 },
  slotTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
    gap: 2,
  },
  slotTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  slotTabText: { fontSize: 13 },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  typeEmoji: { marginBottom: 4 },
  typeCardTitle: { fontSize: 14 },
  typeCardSub: { fontSize: 12, lineHeight: 16 },
  scrollContent: { paddingBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  helpText: { fontSize: 13, lineHeight: 18, marginTop: 4, fontStyle: 'italic' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 20, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13 },
  actions: { gap: 10, marginTop: 12 },
  saveBtn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16 },
  clearBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  clearBtnText: { fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15 },
  surpriseBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 12,
  },
  surpriseTitle: { fontSize: 18 },
  surpriseSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  bookRowTitle: { fontSize: 15 },
  bookRowSub: { fontSize: 12, marginTop: 1 },
  bookCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
