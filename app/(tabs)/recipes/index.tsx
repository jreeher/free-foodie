import React, { useState, useCallback } from 'react';
import { usePreferencesStore } from '../../../lib/stores/preferencesStore';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Plus,
  BookOpen,
  X,
  Download,
  LayoutGrid,
  List,
  ChevronRight,
  Library,
  Store,
} from 'lucide-react-native';
import { exportAllRecipes } from '../../../lib/utils/exportRecipes';
import { AddRecipeModal } from '../../../components/recipe/AddRecipeModal';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useRecipes,
  useToggleFavorite,
  useCategories,
  useCreateRecipe,
  RecipeFilters,
  RecipeSortBy,
} from '../../../lib/hooks/useRecipes';
import { RecipeCard } from '../../../components/recipe/RecipeCard';
import { RecipeListSkeleton } from '../../../components/ui/SkeletonLoader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { Recipe } from '../../../lib/database.types';
import { useRecipeBooks } from '../../../lib/hooks/useRecipeBooks';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '../../../lib/theme';

const SORT_OPTIONS: { label: string; value: RecipeSortBy }[] = [
  { label: 'Recently Added', value: 'created_at' },
  { label: 'Rating', value: 'rating' },
  { label: 'A to Z', value: 'title' },
  { label: 'Cook Time', value: 'total_time_minutes' },
];

const COOK_TIME_OPTIONS = [
  { label: 'Any time', value: undefined },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
  { label: 'Under 60 min', value: 60 },
];

export default function RecipesScreen() {
  const { colors, typography, layout } = useTheme();
  const { bookId, bookName } = useLocalSearchParams<{ bookId?: string; bookName?: string }>();

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<RecipeSortBy>('created_at');
  const [maxCookTime, setMaxCookTime] = useState<number | undefined>(undefined);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const viewMode = usePreferencesStore((s) => s.recipeViewMode);
  const setViewMode = usePreferencesStore((s) => s.setRecipeViewMode);

  const { data: books } = useRecipeBooks();
  const activeBook = bookId ? books?.find(b => b.id === bookId) : undefined;

  const filters: RecipeFilters = {
    search: search || undefined,
    categories: selectedCategories.length ? selectedCategories : undefined,
    maxCookTime,
    favoritesOnly: favoritesOnly || undefined,
    mealType: selectedMealType,
    recipeIds: activeBook ? activeBook.recipe_ids : undefined,
  };

  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes(filters, sortBy);
  const { data: categories } = useCategories();
  const toggleFavorite = useToggleFavorite();
  const createRecipe = useCreateRecipe();

  const handleToggleFavorite = useCallback((id: string, current: boolean) => {
    toggleFavorite.mutate({ id, isFavorite: current });
  }, []);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setMaxCookTime(undefined);
    setFavoritesOnly(false);
    setSelectedMealType(undefined);
    setSortBy('created_at');
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || maxCookTime !== undefined || favoritesOnly || !!selectedMealType;

  const handleExportAll = async () => {
    if (!recipes?.length) {
      Alert.alert('No recipes', 'Add some recipes before exporting.');
      return;
    }
    setIsExporting(true);
    try {
      await exportAllRecipes(recipes as any);
    } catch (e: any) {
      Alert.alert('Export failed', e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkImport = async () => {
    const titles = bulkText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!titles.length) return;
    setBulkImporting(true);
    try {
      for (const title of titles) {
        await createRecipe.mutateAsync({
          title,
          description: null,
          prep_time_minutes: null,
          cook_time_minutes: null,
          total_time_minutes: null,
          servings: 4,
          ingredients: [],
          instructions: [],
          categories: [],
          tags: [],
          image_url: undefined,
          is_favorite: false,
          season_tags: [],
          meal_type: null,
        });
      }
      setBulkText('');
      setShowBulkImport(false);
    } catch (e: any) {
      Alert.alert('Import failed', e.message);
    } finally {
      setBulkImporting(false);
    }
  };

  const renderRecipe = useCallback(
    ({ item, index }: { item: Recipe; index: number }) => {
      const isLeftColumn = index % 2 === 0;
      return (
        <View style={[styles.cardWrapper, isLeftColumn ? styles.leftCard : styles.rightCard]}>
          <RecipeCard
            recipe={item}
            onToggleFavorite={handleToggleFavorite}
          />
        </View>
      );
    },
    [handleToggleFavorite]
  );

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
          Recipes
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {viewMode === 'grid'
              ? <List color={colors.textSecondary} size={18} strokeWidth={2} />
              : <LayoutGrid color={colors.textSecondary} size={18} strokeWidth={2} />
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExportAll}
            disabled={isExporting}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {isExporting
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Download color={colors.primary} size={18} strokeWidth={2} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
          >
            <Plus color="#fff" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { paddingHorizontal: layout.screenPaddingH }]}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}
        >
          <Search color={colors.placeholder} size={18} strokeWidth={2} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular },
            ]}
            placeholder="Search recipes..."
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X color={colors.placeholder} size={16} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? colors.primary : colors.surface,
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
        >
          <SlidersHorizontal
            color={hasActiveFilters ? '#fff' : colors.textSecondary}
            size={18}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      {/* Book filter banner */}
      {activeBook && (
        <View style={[styles.bookBanner, { backgroundColor: colors.primary + '15', paddingHorizontal: layout.screenPaddingH }]}>
          <Library size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.bookBannerText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium, flex: 1 }]}>
            {bookName ?? activeBook.name}
          </Text>
          <TouchableOpacity onPress={() => router.setParams({ bookId: undefined, bookName: undefined })} hitSlop={8}>
            <X color={colors.primary} size={14} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Publish to Marketplace button — web only, shown when a non-default book is active */}
      {activeBook && (!activeBook.is_default || activeBook.sort_order !== 0) && Platform.OS === 'web' && (
        <TouchableOpacity
          style={[styles.publishMarketplaceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/(tabs)/marketplace/publish', params: { bookId: activeBook.id } })}
        >
          <Store color={colors.primary} size={15} strokeWidth={2} />
          <Text style={[styles.publishMarketplaceBtnText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
            Publish Book on Marketplace
          </Text>
        </TouchableOpacity>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View
          style={[
            styles.filtersPanel,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          {/* Sort */}
          <Text
            style={[
              styles.filterLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            SORT BY
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSortBy(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      sortBy === opt.value ? colors.primary : colors.background,
                    borderColor:
                      sortBy === opt.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: sortBy === opt.value ? '#fff' : colors.textSecondary,
                      fontFamily: typography.fontFamilies.sansMedium,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cook time */}
          <Text
            style={[
              styles.filterLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            COOK TIME
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {COOK_TIME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => setMaxCookTime(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      maxCookTime === opt.value ? colors.primary : colors.background,
                    borderColor:
                      maxCookTime === opt.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: maxCookTime === opt.value ? '#fff' : colors.textSecondary,
                      fontFamily: typography.fontFamilies.sansMedium,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Meal Type */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            MEAL TYPE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedMealType(selectedMealType === type ? undefined : type)}
                style={[styles.chip, {
                  backgroundColor: selectedMealType === type ? colors.primary : colors.background,
                  borderColor: selectedMealType === type ? colors.primary : colors.border,
                }]}
              >
                <Text style={styles.chipIcon}>{MEAL_TYPE_ICONS[type]}</Text>
                <Text style={[styles.chipText, { color: selectedMealType === type ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  {MEAL_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <>
              <Text
                style={[
                  styles.filterLabel,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamilies.sansSemiBold,
                  },
                ]}
              >
                CATEGORY
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {categories.map((cat) => {
                  const active = selectedCategories.includes(cat.name);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleCategory(cat.name)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.chipIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? '#fff' : colors.textSecondary,
                            fontFamily: typography.fontFamilies.sansMedium,
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

          {/* Favorites toggle + Clear */}
          <View style={styles.filterBottom}>
            <TouchableOpacity
              onPress={() => setFavoritesOnly(!favoritesOnly)}
              style={[
                styles.chip,
                {
                  backgroundColor: favoritesOnly ? '#E74C3C' : colors.background,
                  borderColor: favoritesOnly ? '#E74C3C' : colors.border,
                },
              ]}
            >
              <Text style={styles.chipIcon}>❤️</Text>
              <Text
                style={[
                  styles.chipText,
                  {
                    color: favoritesOnly ? '#fff' : colors.textSecondary,
                    fontFamily: typography.fontFamilies.sansMedium,
                  },
                ]}
              >
                Favorites only
              </Text>
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters}>
                <Text
                  style={[
                    styles.clearText,
                    { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium },
                  ]}
                >
                  Clear all
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Recipe count */}
      {!isLoading && recipes && (
        <Text
          style={[
            styles.count,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamilies.sansRegular,
              paddingHorizontal: layout.screenPaddingH,
            },
          ]}
        >
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </Text>
      )}

      {/* Content */}
      {isLoading ? (
        <RecipeListSkeleton />
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={recipes ?? []}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingHorizontal: layout.screenPaddingH }]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpen size={48} color={colors.textSecondary} strokeWidth={1.5} />}
              title="No recipes yet"
              subtitle="Add your first recipe by tapping the + button above."
              actionLabel="Add Recipe"
              onAction={() => router.push('/(tabs)/recipes/add')}
            />
          }
        />
      ) : (
        <FlatList
          key="list"
          data={recipes ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.grid, { paddingHorizontal: layout.screenPaddingH }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {(item.total_time_minutes || item.categories?.length) ? (
                  <Text style={[styles.listMeta, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]} numberOfLines={1}>
                    {[
                      item.total_time_minutes ? `${item.total_time_minutes} min` : null,
                      item.categories?.length ? item.categories.join(', ') : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
              {item.is_favorite && <Text style={{ fontSize: 14 }}>❤️</Text>}
              <ChevronRight size={16} color={colors.border} strokeWidth={2} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpen size={48} color={colors.textSecondary} strokeWidth={1.5} />}
              title="No recipes yet"
              subtitle="Add your first recipe by tapping the + button above."
              actionLabel="Add Recipe"
              onAction={() => router.push('/(tabs)/recipes/add')}
            />
          }
        />
      )}

      <AddRecipeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onBulkImport={() => setShowBulkImport(true)}
      />

      {/* Bulk Import Modal */}
      <Modal visible={showBulkImport} transparent animationType="slide" onRequestClose={() => setShowBulkImport(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowBulkImport(false)} />
          <View style={[styles.bulkSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.bulkHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.bulkTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Bulk Import
            </Text>
            <Text style={[styles.bulkSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Enter one recipe title per line. Each will be saved as a recipe you can fill in later.
            </Text>
            <TextInput
              style={[
                styles.bulkInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamilies.sansRegular,
                },
              ]}
              placeholder={'Spaghetti Bolognese\nChicken Tikka Masala\nAvocado Toast'}
              placeholderTextColor={colors.placeholder}
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.bulkBtn,
                { backgroundColor: bulkText.trim() && !bulkImporting ? colors.primary : colors.border },
              ]}
              onPress={handleBulkImport}
              disabled={!bulkText.trim() || bulkImporting}
            >
              {bulkImporting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.bulkBtnText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                    Import {bulkText.split('\n').filter((l) => l.trim()).length || ''} Recipes
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersPanel: {
    borderBottomWidth: 1,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 13,
  },
  filterBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  clearText: {
    fontSize: 14,
  },
  count: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
  grid: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  leftCard: {},
  rightCard: {},
  // ── List view ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  listTitle: { fontSize: 15 },
  listMeta: { fontSize: 12, marginTop: 2 },

  // ── Bulk import sheet ──
  bulkSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 12,
  },
  bulkHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  bulkTitle: { fontSize: 24 },
  bulkSubtitle: { fontSize: 13, lineHeight: 18 },
  bulkInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 160,
    maxHeight: 260,
  },
  bulkBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  bulkBtnText: { color: '#fff', fontSize: 16 },

  // ── Book filter banner ──
  bookBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 },
  bookBannerText: { flex: 1, fontSize: 13 },
  publishMarketplaceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  publishMarketplaceBtnText: { fontSize: 13 },

});
