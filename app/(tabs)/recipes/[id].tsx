import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { shareText } from '../../../lib/utils/webCompat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Edit3,
  Share2,
  Trash2,
  Heart,
  Copy,
  Clock,
  ChefHat,
  CalendarPlus,
  ShoppingCart,
  Check,
  Download,
  BookMarked,
} from 'lucide-react-native';
import { exportSingleRecipe } from '../../../lib/utils/exportRecipes';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useToggleFavorite,
  useCreateRecipe,
  useMarkRecipeCooked,
} from '../../../lib/hooks/useRecipes';
import { ServingsAdjuster } from '../../../components/recipe/ServingsAdjuster';
import { IngredientRow, IngredientGroupHeader } from '../../../components/recipe/IngredientRow';
import { InstructionStep } from '../../../components/recipe/InstructionStep';
import { StarRating } from '../../../components/ui/StarRating';
import { Badge } from '../../../components/ui/Badge';
import { formatTime } from '../../../lib/utils/fractions';
import { Ingredient } from '../../../lib/database.types';
import { AddToPlanModal } from '../../../components/meal-plan/AddToPlanModal';
import { AddToBookModal } from '../../../components/recipe/AddToBookModal';
import { useAddRecipeToGroceryList } from '../../../lib/hooks/useGroceryList';
import { getWeekStart } from '../../../lib/utils/dates';

const HERO_HEIGHT = 280;

function formatLastCooked(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();

  const { data: recipe, isLoading } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleFavorite();
  const createRecipe = useCreateRecipe();
  const markCooked = useMarkRecipeCooked();
  const addToList = useAddRecipeToGroceryList();

  const [servings, setServings] = useState<number | null>(null);
  const [showAddToPlan, setShowAddToPlan] = useState(false);
  const [showAddToBook, setShowAddToBook] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (isLoading || !recipe) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentServings = servings ?? recipe.servings;
  const multiplier = currentServings / recipe.servings;

  // Group ingredients by group field
  const groupedIngredients: { group: string | null; items: Ingredient[] }[] = [];
  for (const ing of recipe.ingredients) {
    const group = ing.group ?? null;
    const existing = groupedIngredients.find((g) => g.group === group);
    if (existing) {
      existing.items.push(ing);
    } else {
      groupedIngredients.push({ group, items: [ing] });
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecipe.mutate(recipe.id, {
              onSuccess: () => router.back(),
            });
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    const { id: _id, created_at, updated_at, user_id, ...rest } = recipe;
    createRecipe.mutate(
      { ...rest, title: `${recipe.title} (copy)` },
      { onSuccess: (newRecipe) => router.replace(`/(tabs)/recipes/${newRecipe.id}`) }
    );
  };

  const handleShare = async () => {
    const text = recipe.source_url
      ? `Check out this recipe: ${recipe.title}\n${recipe.source_url}`
      : `Recipe: ${recipe.title}`;
    await shareText(text, recipe.title);
  };

  const handleRating = (rating: number) => {
    updateRecipe.mutate({ id: recipe.id, updates: { rating: rating || null } });
  };

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite.mutate({ id: recipe.id, isFavorite: recipe.is_favorite });
  };

  const handleExportCard = async () => {
    setIsExporting(true);
    try {
      await exportSingleRecipe(recipe as any);
    } catch (e: any) {
      Alert.alert('Export failed', e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          {recipe.image_url ? (
            <Image
              source={{ uri: recipe.image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
              <Image
                source={require('../../../assets/app-icon.png')}
                style={styles.heroPlaceholderIcon}
                contentFit="contain"
              />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.2)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back button */}
          <SafeAreaView edges={['top']} style={styles.heroNav}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.heroButton}
              hitSlop={8}
            >
              <ArrowLeft color="#fff" size={22} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={handleShare} style={styles.heroButton}>
                <Share2 color="#fff" size={20} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/recipes/edit/${recipe.id}`)}
                style={styles.heroButton}
              >
                <Edit3 color="#fff" size={20} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} style={styles.heroButton}>
                <Heart
                  color={recipe.is_favorite ? '#E74C3C' : '#fff'}
                  fill={recipe.is_favorite ? '#E74C3C' : 'transparent'}
                  size={20}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={[styles.content, { paddingHorizontal: layout.screenPaddingH }]}>
          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
            ]}
          >
            {recipe.title}
          </Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <StarRating value={recipe.rating} onChange={handleRating} size={22} />
            {recipe.rating ? (
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                ]}
              >
                {recipe.rating}/5
              </Text>
            ) : (
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                ]}
              >
                Tap to rate
              </Text>
            )}
          </View>

          {/* Description */}
          {recipe.description ? (
            <Text
              style={[
                styles.description,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              {recipe.description}
            </Text>
          ) : null}

          {/* Meta row */}
          <View style={[styles.metaRow, { borderColor: colors.border }]}>
            {recipe.prep_time_minutes ? (
              <View style={styles.metaItem}>
                <Clock size={16} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Prep
                </Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  {formatTime(recipe.prep_time_minutes)}
                </Text>
              </View>
            ) : null}
            {recipe.cook_time_minutes ? (
              <View style={styles.metaItem}>
                <ChefHat size={16} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Cook
                </Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  {formatTime(recipe.cook_time_minutes)}
                </Text>
              </View>
            ) : null}
            {recipe.total_time_minutes ? (
              <View style={styles.metaItem}>
                <Clock size={16} color={colors.primary} strokeWidth={1.5} />
                <Text style={[styles.metaLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Total
                </Text>
                <Text style={[styles.metaValue, { color: colors.primary, fontFamily: typography.fontFamilies.sansBold }]}>
                  {formatTime(recipe.total_time_minutes)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Servings adjuster */}
          <View style={[styles.servingsRow, { borderBottomColor: colors.border }]}>
            <ServingsAdjuster
              baseServings={recipe.servings}
              currentServings={currentServings}
              onChange={setServings}
            />
          </View>

          {/* Categories & Tags */}
          {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
            <View style={styles.tagsRow}>
              {recipe.categories.map((cat) => (
                <Badge key={cat} label={cat} variant="primary" />
              ))}
              {recipe.tags.map((tag) => (
                <Badge key={tag} label={tag} variant="outline" />
              ))}
            </View>
          )}

          {/* Source link */}
          {recipe.source_url ? (
            <Text
              style={[
                styles.sourceUrl,
                { color: colors.primary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
              numberOfLines={1}
            >
              Source: {recipe.source_url}
            </Text>
          ) : null}

          {/* Ingredients */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
            ]}
          >
            Ingredients
          </Text>
          <View style={[styles.ingredientsList, { borderColor: colors.border }]}>
            {groupedIngredients.map(({ group, items }) => (
              <View key={group ?? 'default'}>
                {group && <IngredientGroupHeader label={group} />}
                {items.map((ing, i) => (
                  <View
                    key={`${ing.name}-${i}`}
                    style={[
                      styles.ingredientBorder,
                      { borderBottomColor: colors.border },
                      i === items.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <IngredientRow
                      ingredient={ing}
                      servingsMultiplier={multiplier}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Instructions */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
            ]}
          >
            Instructions
          </Text>
          <View style={styles.instructionsList}>
            {recipe.instructions.map((step, i) => (
              <InstructionStep
                key={i}
                step={step}
                index={i}
                total={recipe.instructions.length}
              />
            ))}
          </View>

          {/* Notes */}
          {!!recipe.notes && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
                ]}
              >
                Notes
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 24,
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamilies.sansRegular,
                  marginBottom: 28,
                }}
              >
                {recipe.notes}
              </Text>
            </>
          )}

          {/* Mark as cooked */}
          <TouchableOpacity
            style={[styles.markCookedBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => markCooked.mutate(recipe.id)}
            disabled={markCooked.isPending}
          >
            <Text style={{ fontSize: 18 }}>🥘</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.markCookedLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Mark as cooked
              </Text>
              {recipe.last_cooked_at && (
                <Text style={[styles.lastCookedText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Last cooked {formatLastCooked(recipe.last_cooked_at)}
                </Text>
              )}
            </View>
            {markCooked.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Check size={16} color={colors.primary} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={[styles.actionBtnsRow, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleExportCard}
              disabled={isExporting}
            >
              {isExporting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Download color={colors.primary} size={20} strokeWidth={1.75} />
              }
              <Text style={[styles.actionBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Recipe Card
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowAddToBook(true)}
            >
              <BookMarked color={colors.primary} size={20} strokeWidth={1.75} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Save to Book
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danger zone — hidden for built-in default recipes */}
          {!recipe.is_default && (
            <View style={[styles.dangerZone, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={handleDuplicate}
                style={styles.dangerAction}
              >
                <Copy size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.dangerText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Duplicate recipe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.dangerAction}
              >
                <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
                <Text style={[styles.dangerText, { color: colors.destructive, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Delete recipe
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.stickyButton, styles.stickyButtonSecondary, { borderColor: colors.border }]}
          onPress={() =>
            addToList.mutate({
              weekStart: getWeekStart(),
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              ingredients: recipe.ingredients,
              recipeServings: recipe.servings,
              targetServings: servings ?? recipe.servings,
            })
          }
          disabled={addToList.isPending}
        >
          {addToList.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ShoppingCart size={18} color={colors.primary} strokeWidth={2} />
          )}
          <Text
            style={[
              styles.stickyButtonText,
              { color: colors.primary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            Add to List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stickyButton, styles.stickyButtonPrimary, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddToPlan(true)}
        >
          <CalendarPlus size={18} color="#fff" strokeWidth={2} />
          <Text
            style={[
              styles.stickyButtonText,
              { color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            Add to Plan
          </Text>
        </TouchableOpacity>
      </View>

      <AddToPlanModal
        visible={showAddToPlan}
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        onClose={() => setShowAddToPlan(false)}
      />
      <AddToBookModal
        visible={showAddToBook}
        recipeId={recipe.id}
        onClose={() => setShowAddToBook(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    position: 'relative',
  },
  heroPlaceholder: {
    backgroundColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    width: 120,
    height: 120,
    opacity: 0.5,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    paddingTop: 20,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  ratingText: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 0,
    marginBottom: 20,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metaValue: {
    fontSize: 15,
  },
  servingsRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  sourceUrl: {
    fontSize: 13,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 12,
    marginTop: 8,
  },
  ingredientsList: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  ingredientBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  instructionsList: {
    marginBottom: 28,
  },
  markCookedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  markCookedLabel: {
    fontSize: 15,
  },
  lastCookedText: {
    fontSize: 12,
    marginTop: 1,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 12,
  },
  dangerZone: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dangerText: {
    fontSize: 15,
  },
  bottomSpacer: {
    height: 100,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 10,
  },
  stickyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  stickyButtonPrimary: {},
  stickyButtonSecondary: {
    borderWidth: 1.5,
  },
  stickyButtonText: {
    fontSize: 15,
  },
});
