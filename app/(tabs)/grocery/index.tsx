import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingCart,
  RefreshCw,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useGroceryList,
  useGroceryListItems,
  useGroceryListRealtime,
  useGenerateGroceryList,
  useToggleGroceryItem,
  useAddCustomGroceryItem,
  useRemoveGroceryItem,
  useClearCheckedItems,
  useDeleteGroceryList,
  useUpdateGroceryItemCategory,
  useSaveGroceryPref,
} from '../../../lib/hooks/useGroceryList';
import { useMealPlan } from '../../../lib/hooks/useMealPlan';
import { getWeekStart, formatWeekRange } from '../../../lib/utils/dates';
import { GroceryListItem } from '../../../lib/database.types';
import { STORE_SECTIONS, StoreSection } from '../../../lib/theme';
import { useGroceryCategoryStore } from '../../../lib/stores/groceryCategoryStore';
import { useSyncGroceryPrefsFromDb, useUpsertGroceryPref } from '../../../lib/hooks/useHouseholdSync';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

// ─── Item component ───────────────────────────────────────────────────────────

type GroceryItemProps = {
  item: GroceryListItem;
  onToggle: () => void;
  onRemove: () => void;
  onMove: () => void;
  colors: any;
  typography: any;
};

const GroceryItem = React.memo(function GroceryItem({
  item,
  onToggle,
  onRemove,
  onMove,
  colors,
  typography,
}: GroceryItemProps) {
  const isChecked = item.is_checked;
  const amountParts = [item.amount, item.unit].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      style={[styles.itemRow, { borderBottomColor: colors.border }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {isChecked ? (
        <CheckSquare size={20} color={colors.primary} strokeWidth={2} />
      ) : (
        <Square size={20} color={colors.border} strokeWidth={2} />
      )}

      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            {
              color: isChecked ? colors.textSecondary : colors.textPrimary,
              fontFamily: typography.fontFamilies.sansRegular,
              textDecorationLine: isChecked ? 'line-through' : 'none',
            },
          ]}
        >
          {item.name}
        </Text>
        {amountParts ? (
          <Text
            style={[
              styles.itemAmount,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamilies.mono,
                opacity: isChecked ? 0.5 : 1,
              },
            ]}
          >
            {amountParts}
          </Text>
        ) : null}
      </View>

      {!isChecked && (
        <TouchableOpacity onPress={onMove} hitSlop={8} style={styles.moveBtn}>
          <ArrowLeftRight size={14} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onRemove} hitSlop={8}>
        <X size={14} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GroceryScreen() {
  const { colors, typography, layout } = useTheme();

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  // Data hooks
  const { data: groceryList, isLoading: listLoading, refetch: refetchList } = useGroceryList(weekStart);
  const { data: mealPlan } = useMealPlan(weekStart);
  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useGroceryListItems(groceryList?.id);
  useGroceryListRealtime(groceryList?.id);

  // Mutations
  const generateList = useGenerateGroceryList();
  const toggleItem = useToggleGroceryItem();
  const addCustom = useAddCustomGroceryItem();
  const removeItem = useRemoveGroceryItem();
  const clearChecked = useClearCheckedItems();
  const deleteList = useDeleteGroceryList();
  const updateCategory = useUpdateGroceryItemCategory();
  const saveGroceryPref = useSaveGroceryPref();
  const { setPreference } = useGroceryCategoryStore();
  useSyncGroceryPrefsFromDb(); // load from DB and keep household in sync
  const upsertGroceryPref = useUpsertGroceryPref();

  // Local UI state
  const [customInput, setCustomInput] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [checkedExpanded, setCheckedExpanded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<StoreSection>>(new Set());
  const [addSectionTarget, setAddSectionTarget] = useState<StoreSection | null>(null);
  const [sectionInputValue, setSectionInputValue] = useState('');
  const [moveTarget, setMoveTarget] = useState<GroceryListItem | null>(null);

  const toggleSection = useCallback((section: StoreSection) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const isLoading = listLoading || itemsLoading;

  // ─── Computed ──────────────────────────────────────────────────────────────

  const uncheckedItems = useMemo(() => items.filter((i) => !i.is_checked), [items]);
  const checkedItems = useMemo(() => items.filter((i) => i.is_checked), [items]);
  const totalCount = items.length;
  const checkedCount = checkedItems.length;

  // Group unchecked items by store section
  const itemsBySection = useMemo(() => {
    const map: Partial<Record<StoreSection, GroceryListItem[]>> = {};
    for (const item of uncheckedItems) {
      const sec = (STORE_SECTIONS.includes(item.aisle_category as StoreSection)
        ? item.aisle_category
        : 'Other') as StoreSection;
      if (!map[sec]) map[sec] = [];
      map[sec]!.push(item);
    }
    return map;
  }, [uncheckedItems]);

  // ─── Item event handlers ───────────────────────────────────────────────────

  const handleToggle = useCallback(
    (item: GroceryListItem) => {
      if (!groceryList) return;
      toggleItem.mutate({ itemId: item.id, listId: groceryList.id, checked: !item.is_checked });
    },
    [groceryList, toggleItem]
  );

  const handleRemove = useCallback(
    (item: GroceryListItem) => {
      if (!groceryList) return;
      removeItem.mutate({ itemId: item.id, listId: groceryList.id });
    },
    [groceryList, removeItem]
  );

  const handleMove = useCallback((item: GroceryListItem) => {
    setMoveTarget(item);
  }, []);

  const handleMoveToSection = useCallback(
    (section: StoreSection) => {
      if (!moveTarget) return;
      if (groceryList) {
        updateCategory.mutate({ itemId: moveTarget.id, listId: groceryList.id, category: section });
      }
      saveGroceryPref.mutate({ name: moveTarget.name, section });
      setPreference(moveTarget.name, section);
      upsertGroceryPref.mutate({ ingredientName: moveTarget.name, aisleCategory: section }); // persist to DB
      setMoveTarget(null);
    },
    [moveTarget, groceryList, updateCategory, saveGroceryPref, setPreference, upsertGroceryPref]
  );

  // ─── List actions ──────────────────────────────────────────────────────────

  const handleGenerate = (replaceExisting = false) => {
    generateList.mutate({ weekStart, mealPlanId: mealPlan?.id ?? null, replaceExisting });
  };

  const handleRegenerateConfirm = () => {
    Alert.alert(
      'Regenerate list?',
      "This will replace all non-custom items with fresh ingredients from this week's meal plan.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: () => handleGenerate(true) },
      ]
    );
  };

  const handleDeleteList = () => {
    if (!groceryList) return;
    Alert.alert('Clear everything?', 'This will delete your entire grocery list for this week.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteList.mutate({ listId: groceryList.id, weekStart }) },
    ]);
  };

  const handleAddCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    addCustom.mutate({ listId: groceryList?.id ?? null, weekStart, name });
    setCustomInput('');
    setShowAddInput(false);
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ErrorBoundary>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Grocery List
            </Text>
          </View>
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (!groceryList || items.length === 0) {
    return (
      <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Grocery List
          </Text>
        </View>
        <View style={styles.center}>
          <ShoppingCart size={56} color={colors.textSecondary} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            No grocery list yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            {mealPlan
              ? "Tap 'Generate Grocery List' to build your shopping list from this week's meal plan."
              : "Generate a meal plan, then tap 'Generate List' to build your grocery list."}
          </Text>
          {mealPlan && (
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: colors.primary }]}
              onPress={() => handleGenerate(false)}
              disabled={generateList.isPending}
            >
              {generateList.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <ShoppingCart size={18} color="#fff" strokeWidth={2} />
                  <Text style={[styles.generateButtonText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                    Generate Grocery List
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAddInput(true)} style={styles.addCustomLink}>
            <Plus size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.addCustomLinkText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Add item manually
            </Text>
          </TouchableOpacity>
        </View>
        {showAddInput && (
          <View style={[styles.addBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.addInput, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
              placeholder="Item name..."
              placeholderTextColor={colors.placeholder}
              value={customInput}
              onChangeText={setCustomInput}
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.addInputButton, { backgroundColor: customInput.trim() ? colors.primary : colors.border }]}
              onPress={handleAddCustom}
              disabled={!customInput.trim()}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowAddInput(false); setCustomInput(''); }} hitSlop={8}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
      </ErrorBoundary>
    );
  }

  // ─── Main list ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Grocery List
          </Text>
          <Text style={[styles.weekLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            {weekRange} · {totalCount - checkedCount} remaining
          </Text>
        </View>
        <View style={styles.headerActions}>
          {checkedCount > 0 && (
            <TouchableOpacity
              onPress={() => groceryList && clearChecked.mutate(groceryList.id)}
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <CheckSquare size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleRegenerateConfirm}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            disabled={generateList.isPending}
          >
            {generateList.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteList}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Trash2 size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.border, marginHorizontal: layout.screenPaddingH }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${(checkedCount / totalCount) * 100}%` as any },
            ]}
          />
        </View>
      )}

      {/* All sections */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {STORE_SECTIONS.map((section) => {
          const sectionItems = itemsBySection[section as StoreSection] ?? [];
          const isCollapsed = collapsedSections.has(section as StoreSection);

          return (
            <View
              key={section}
              style={[styles.section, { borderColor: colors.border }]}
            >
              {/* Section header */}
              <TouchableOpacity
                style={[
                  styles.sectionHeader,
                  { borderBottomColor: isCollapsed ? 'transparent' : colors.border },
                ]}
                onPress={() => toggleSection(section as StoreSection)}
                activeOpacity={0.7}
              >
                {isCollapsed
                  ? <ChevronRight size={13} color={colors.textSecondary} strokeWidth={2} />
                  : <ChevronDown size={13} color={colors.textSecondary} strokeWidth={2} />
                }
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold, flex: 1 }]}>
                  {section}
                </Text>
                {sectionItems.length > 0 && (
                  <Text style={[styles.sectionCount, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {sectionItems.length}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Items */}
              {!isCollapsed && sectionItems.map((item) => (
                <GroceryItem
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggle(item)}
                  onRemove={() => handleRemove(item)}
                  onMove={() => handleMove(item)}
                  colors={colors}
                  typography={typography}
                />
              ))}

              {/* Empty section */}
              {!isCollapsed && sectionItems.length === 0 && (
                <View style={styles.emptySection}>
                  <Text style={[styles.emptySectionText, { color: colors.placeholder, fontFamily: typography.fontFamilies.sansRegular }]}>
                    No items
                  </Text>
                </View>
              )}

              {/* Per-section add item */}
              {!isCollapsed && (
                addSectionTarget === section ? (
                  <View style={[styles.sectionAddRow, { borderTopColor: colors.border }]}>
                    <TextInput
                      style={[
                        styles.sectionAddInput,
                        {
                          color: colors.textPrimary,
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          fontFamily: typography.fontFamilies.sansRegular,
                        },
                      ]}
                      placeholder={`Add to ${section}...`}
                      placeholderTextColor={colors.placeholder}
                      value={sectionInputValue}
                      onChangeText={setSectionInputValue}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const name = sectionInputValue.trim();
                        if (name) {
                          addCustom.mutate({ listId: groceryList?.id ?? null, weekStart, name, aisleCategory: section });
                        }
                        setSectionInputValue('');
                        setAddSectionTarget(null);
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const name = sectionInputValue.trim();
                        if (name) {
                          addCustom.mutate({ listId: groceryList?.id ?? null, weekStart, name, aisleCategory: section });
                        }
                        setSectionInputValue('');
                        setAddSectionTarget(null);
                      }}
                      disabled={!sectionInputValue.trim()}
                      style={[styles.sectionAddBtn, { backgroundColor: sectionInputValue.trim() ? colors.primary : colors.border }]}
                    >
                      <Plus size={16} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setSectionInputValue(''); setAddSectionTarget(null); }}
                      hitSlop={8}
                    >
                      <X size={16} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.sectionAddTrigger, { borderTopColor: colors.border }]}
                    onPress={() => { setAddSectionTarget(section as StoreSection); setSectionInputValue(''); }}
                  >
                    <Plus size={13} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.sectionAddTriggerText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      Add item
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          );
        })}

        {/* Checked items section */}
        {checkedItems.length > 0 && (
          <View style={[styles.section, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.sectionHeader, { borderBottomColor: colors.border }]}
              onPress={() => setCheckedExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Checked ({checkedCount})
              </Text>
            </TouchableOpacity>
            {checkedExpanded && checkedItems.map((item) => (
              <GroceryItem
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item)}
                onRemove={() => handleRemove(item)}
                onMove={() => {}}
                colors={colors}
                typography={typography}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Section picker bottom sheet */}
      <Modal
        visible={!!moveTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setMoveTarget(null)}
      >
        <TouchableWithoutFeedback onPress={() => setMoveTarget(null)}>
          <View style={styles.sheetOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.sectionSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            Move "{moveTarget?.name}" to…
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {STORE_SECTIONS.map((section) => {
              const isCurrent = section === moveTarget?.aisle_category;
              return (
                <TouchableOpacity
                  key={section}
                  style={[
                    styles.sheetOption,
                    { borderBottomColor: colors.border },
                    isCurrent && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleMoveToSection(section as StoreSection)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sheetOptionText,
                    {
                      color: isCurrent ? colors.primary : colors.textPrimary,
                      fontFamily: isCurrent ? typography.fontFamilies.sansMedium : typography.fontFamilies.sansRegular,
                    },
                  ]}>
                    {section}
                  </Text>
                  {isCurrent && (
                    <Text style={[styles.sheetCurrentBadge, { color: colors.primary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      current
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.sheetCancel, { borderTopColor: colors.border }]}
            onPress={() => setMoveTarget(null)}
          >
            <Text style={[styles.sheetCancelText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add item bar */}
      <View style={[styles.addBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {showAddInput ? (
          <View style={styles.addInputRow}>
            <TextInput
              style={[
                styles.addInput,
                { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular },
              ]}
              placeholder="Add item..."
              placeholderTextColor={colors.placeholder}
              value={customInput}
              onChangeText={setCustomInput}
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.addInputButton, { backgroundColor: customInput.trim() ? colors.primary : colors.border }]}
              onPress={handleAddCustom}
              disabled={!customInput.trim()}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowAddInput(false); setCustomInput(''); }} hitSlop={8}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAddInput(true)}>
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
            <Text style={[styles.addTriggerText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Add item
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: { fontSize: 30, lineHeight: 36 },
  weekLabel: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressBar: { height: 3, borderRadius: 2, marginBottom: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Sections
  section: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  sectionTitle: { fontSize: 13, letterSpacing: 0.3 },
  sectionCount: { fontSize: 12 },
  emptySection: { paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center' },
  emptySectionText: { fontSize: 13 },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, lineHeight: 20 },
  itemAmount: { fontSize: 13, marginTop: 1 },
  moveBtn: {
    padding: 4,
  },

  // Empty state
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  generateButtonText: { color: '#fff', fontSize: 16 },
  addCustomLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addCustomLinkText: { fontSize: 14 },

  // Add bar
  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  addTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addTriggerText: { fontSize: 15 },
  addInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addInputButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section picker sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sectionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 15,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetOptionText: { fontSize: 15 },
  sheetCurrentBadge: { fontSize: 12, opacity: 0.7 },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  sheetCancelText: { fontSize: 15 },

  // Per-section add item
  sectionAddTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionAddTriggerText: {
    fontSize: 13,
  },
  sectionAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionAddInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  sectionAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
