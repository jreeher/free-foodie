import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, PenLine, ChefHat, Clock } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useRecipes } from '../../lib/hooks/useRecipes';
import { Recipe } from '../../lib/database.types';
import { MealSlot } from '../../lib/database.types';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

type Props = {
  visible: boolean;
  slot: MealSlot | null;
  dateLabel?: string;
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectCustom: (name: string) => void;
  onClose: () => void;
};

export function RecipePickerModal({
  visible,
  slot,
  dateLabel,
  onSelectRecipe,
  onSelectCustom,
  onClose,
}: Props) {
  const { colors, typography } = useTheme();
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [mode, setMode] = useState<'recipes' | 'custom'>('recipes');

  const { data: recipes, isLoading } = useRecipes(
    { search: search || undefined },
    'title'
  );

  const handleSelectRecipe = useCallback(
    (recipe: Recipe) => {
      onSelectRecipe(recipe);
      setSearch('');
      setCustomName('');
      setMode('recipes');
    },
    [onSelectRecipe]
  );

  const handleSubmitCustom = useCallback(() => {
    const name = customName.trim();
    if (!name) return;
    onSelectCustom(name);
    setCustomName('');
    setSearch('');
    setMode('recipes');
  }, [customName, onSelectCustom]);

  const handleClose = () => {
    setSearch('');
    setCustomName('');
    setMode('recipes');
    onClose();
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={[styles.recipeRow, { borderBottomColor: colors.border }]}
      onPress={() => handleSelectRecipe(item)}
      activeOpacity={0.7}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.recipeThumb} />
      ) : (
        <View style={[styles.recipeThumbPlaceholder, { backgroundColor: colors.surface }]}>
          <ChefHat size={18} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.recipeInfo}>
        <Text
          style={[
            styles.recipeTitle,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.total_time_minutes && (
          <View style={styles.recipeTime}>
            <Clock size={11} color={colors.textSecondary} strokeWidth={2} />
            <Text
              style={[
                styles.recipeTimeText,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              {item.total_time_minutes} min
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: colors.textPrimary,
                    fontFamily: typography.fontFamilies.serifDisplay,
                  },
                ]}
              >
                {slot ? `Add ${SLOT_LABELS[slot]}` : 'Add Meal'}
              </Text>
              {dateLabel && (
                <Text
                  style={[
                    styles.headerSub,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamilies.sansRegular,
                    },
                  ]}
                >
                  {dateLabel}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Mode toggle */}
          <View style={[styles.modeRow, { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }]}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  borderBottomWidth: 2,
                  borderBottomColor: mode === 'recipes' ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setMode('recipes')}
            >
              <Text
                style={[
                  styles.modeLabel,
                  {
                    color: mode === 'recipes' ? colors.primary : colors.textSecondary,
                    fontFamily:
                      mode === 'recipes'
                        ? typography.fontFamilies.sansSemiBold
                        : typography.fontFamilies.sansRegular,
                  },
                ]}
              >
                From Recipes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  borderBottomWidth: 2,
                  borderBottomColor: mode === 'custom' ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setMode('custom')}
            >
              <Text
                style={[
                  styles.modeLabel,
                  {
                    color: mode === 'custom' ? colors.primary : colors.textSecondary,
                    fontFamily:
                      mode === 'custom'
                        ? typography.fontFamilies.sansSemiBold
                        : typography.fontFamilies.sansRegular,
                  },
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'recipes' ? (
            <>
              {/* Search */}
              <View style={[styles.searchRow, { paddingHorizontal: 20, paddingBottom: 10 }]}>
                <View
                  style={[
                    styles.searchBox,
                    { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                  ]}
                >
                  <Search size={16} color={colors.placeholder} strokeWidth={2} />
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        color: colors.textPrimary,
                        fontFamily: typography.fontFamilies.sansRegular,
                      },
                    ]}
                    placeholder="Search your recipes..."
                    placeholderTextColor={colors.placeholder}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                      <X size={14} color={colors.placeholder} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Recipe list */}
              {isLoading ? (
                <ActivityIndicator
                  style={{ marginTop: 40 }}
                  color={colors.primary}
                />
              ) : (
                <FlatList
                  data={recipes ?? []}
                  renderItem={renderRecipe}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text
                      style={[
                        styles.emptyText,
                        {
                          color: colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansRegular,
                        },
                      ]}
                    >
                      {search ? 'No recipes match your search.' : 'No recipes yet.'}
                    </Text>
                  }
                />
              )}
            </>
          ) : (
            /* Custom meal entry */
            <View style={[styles.customSection, { paddingHorizontal: 20 }]}>
              <PenLine size={32} color={colors.primary} strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <Text
                style={[
                  styles.customHint,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamilies.sansRegular,
                  },
                ]}
              >
                Name a meal that isn't in your recipe library — leftovers, takeout, eating out, etc.
              </Text>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    fontFamily: typography.fontFamilies.sansRegular,
                  },
                ]}
                placeholder="e.g. Leftover soup, Pizza night..."
                placeholderTextColor={colors.placeholder}
                value={customName}
                onChangeText={setCustomName}
                returnKeyType="done"
                onSubmitEditing={handleSubmitCustom}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.customButton,
                  {
                    backgroundColor: customName.trim() ? colors.primary : colors.border,
                  },
                ]}
                onPress={handleSubmitCustom}
                disabled={!customName.trim()}
              >
                <Text
                  style={[
                    styles.customButtonText,
                    { fontFamily: typography.fontFamilies.sansSemiBold },
                  ]}
                >
                  Add Meal
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 24,
  },
  modeTab: {
    paddingBottom: 8,
  },
  modeLabel: {
    fontSize: 15,
  },
  searchRow: {},
  searchBox: {
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
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  recipeThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  recipeThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    gap: 3,
  },
  recipeTitle: {
    fontSize: 15,
  },
  recipeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recipeTimeText: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 14,
  },
  customSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  customHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  customInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  customButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  customButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
