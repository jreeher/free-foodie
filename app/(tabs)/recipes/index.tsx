import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipes, RecipeFilters, RecipeWithMeta } from '../../../lib/hooks/useRecipes';
import { RecipeCard } from '../../../components/recipe/RecipeCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../../lib/theme';
import { useFoodBankItems } from '../../../lib/hooks/useFoodBankItems';
import { SkillLevel } from '../../../lib/database.types';

export default function RecipesScreen() {
  const { colors, typography, layout } = useTheme();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [canMakeNow, setCanMakeNow] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | undefined>(undefined);
  const [foodBankItemId, setFoodBankItemId] = useState<string | undefined>(undefined);

  const { data: foodBankItems } = useFoodBankItems();

  const filters: RecipeFilters = {
    search: search || undefined,
    canMakeNow: canMakeNow || undefined,
    skillLevel,
    foodBankItemId,
  };

  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes(filters);

  const hasActiveFilters = canMakeNow || !!skillLevel || !!foodBankItemId;
  const clearFilters = () => {
    setCanMakeNow(false);
    setSkillLevel(undefined);
    setFoodBankItemId(undefined);
  };

  const renderRecipe = useCallback(({ item, index }: { item: RecipeWithMeta; index: number }) => (
    <View style={[styles.cardWrapper, { marginRight: index % 2 === 0 ? 12 : 0 }]}>
      <RecipeCard recipe={item} />
    </View>
  ), []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Recipes
          </Text>
        </View>

        <View style={[styles.searchRow, { paddingHorizontal: layout.screenPaddingH }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Search color={colors.placeholder} size={18} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
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
              { backgroundColor: hasActiveFilters ? colors.primary : colors.surface, borderColor: hasActiveFilters ? colors.primary : colors.border },
            ]}
          >
            <SlidersHorizontal color={hasActiveFilters ? '#fff' : colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setCanMakeNow(!canMakeNow)}
              style={[styles.chip, { backgroundColor: canMakeNow ? colors.primary : colors.background, borderColor: canMakeNow ? colors.primary : colors.border }]}
            >
              <Text style={{ color: canMakeNow ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                Can make now
              </Text>
            </TouchableOpacity>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>SKILL LEVEL</Text>
            <View style={styles.chipRow}>
              {SKILL_LEVELS.map((level) => {
                const active = skillLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSkillLevel(active ? undefined : level)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                      {SKILL_LEVEL_LABELS[level]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>FOOD BANK ITEM</Text>
            <View style={styles.chipRow}>
              {(foodBankItems ?? []).slice(0, 12).map((fbi) => {
                const active = foodBankItemId === fbi.id;
                return (
                  <TouchableOpacity
                    key={fbi.id}
                    onPress={() => setFoodBankItemId(active ? undefined : fbi.id)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>{fbi.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          data={recipes ?? []}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingHorizontal: layout.screenPaddingH }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon={<BookOpen size={48} color={colors.textSecondary} strokeWidth={1.5} />}
                title="No recipes yet"
                subtitle="Be the first to submit a recipe from the Submit tab."
              />
            ) : null
          }
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 30, lineHeight: 36 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filtersPanel: { borderBottomWidth: 1, paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20, gap: 8 },
  filterLabel: { fontSize: 11, letterSpacing: 1.5, marginTop: 12, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  grid: { paddingBottom: 100, paddingTop: 4 },
  cardWrapper: { flex: 1, marginBottom: 12 },
});
