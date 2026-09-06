import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit3, Trash2, Clock, ChefHat } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipe, useDeleteRecipe } from '../../../lib/hooks/useRecipes';
import { useRecipeRating, useSubmitRating } from '../../../lib/hooks/useRecipeRatings';
import { useUser } from '../../../lib/hooks/useAuth';
import { ServingsAdjuster } from '../../../components/recipe/ServingsAdjuster';
import { IngredientRow, IngredientGroupHeader } from '../../../components/recipe/IngredientRow';
import { InstructionStep } from '../../../components/recipe/InstructionStep';
import { StarRating } from '../../../components/ui/StarRating';
import { Badge } from '../../../components/ui/Badge';
import { SKILL_LEVEL_LABELS } from '../../../lib/theme';
import { Ingredient } from '../../../lib/database.types';

const HERO_HEIGHT = 240;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const user = useUser();

  const { data: recipe, isLoading } = useRecipe(id);
  const { data: ratingSummary } = useRecipeRating(id);
  const submitRating = useSubmitRating();
  const deleteRecipe = useDeleteRecipe();

  const [servings, setServings] = useState<number | null>(null);

  if (isLoading || !recipe) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentServings = servings ?? recipe.servings;
  const multiplier = currentServings / recipe.servings;
  const isOwner = user?.id === recipe.user_id;

  const groupedIngredients: { group: string | null; items: Ingredient[] }[] = [];
  for (const ing of recipe.ingredients) {
    const group = ing.group ?? null;
    const existing = groupedIngredients.find((g) => g.group === group);
    if (existing) existing.items.push(ing);
    else groupedIngredients.push({ group, items: [ing] });
  }

  const handleDelete = () => {
    Alert.alert('Delete Recipe', `Are you sure you want to delete "${recipe.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe.mutate(recipe.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.skeleton }]}>
          {recipe.image_url ? (
            <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <ChefHat color={colors.textSecondary} size={48} strokeWidth={1.5} />
            </View>
          )}
          <SafeAreaView style={styles.heroButtons} edges={['top']}>
            <TouchableOpacity onPress={() => router.back()} style={styles.heroButton} hitSlop={8}>
              <ArrowLeft color="#fff" size={22} strokeWidth={2} />
            </TouchableOpacity>
            {isOwner && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/recipes/edit/[id]', params: { id: recipe.id } })} style={styles.heroButton} hitSlop={8}>
                  <Edit3 color="#fff" size={20} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.heroButton} hitSlop={8}>
                  <Trash2 color="#fff" size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>

        <View style={[styles.content, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            {recipe.title}
          </Text>
          {recipe.submitterName && (
            <Text style={[styles.submitter, { color: colors.textSecondary }]}>by {recipe.submitterName}</Text>
          )}

          <View style={styles.badgeRow}>
            {recipe.skill_level && <Badge label={SKILL_LEVEL_LABELS[recipe.skill_level]} variant="outline" />}
            {recipe.cook_time_minutes ? (
              <View style={styles.metaItem}>
                <Clock size={13} color={colors.textSecondary} strokeWidth={2} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{recipe.cook_time_minutes} min</Text>
              </View>
            ) : null}
          </View>

          {recipe.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{recipe.description}</Text>
          ) : null}

          <View style={styles.ratingSection}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {ratingSummary?.average != null
                  ? `${ratingSummary.average.toFixed(1)} · ${ratingSummary.count} rating${ratingSummary.count === 1 ? '' : 's'}`
                  : 'No ratings yet'}
              </Text>
              <StarRating value={ratingSummary?.average ?? null} readonly size={16} />
            </View>
            {user && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Your rating</Text>
                <StarRating
                  value={ratingSummary?.userRating ?? null}
                  onChange={(rating) => submitRating.mutate({ recipeId: recipe.id, rating })}
                  size={20}
                />
              </View>
            )}
          </View>

          <View style={styles.servingsRow}>
            <ServingsAdjuster baseServings={recipe.servings} currentServings={currentServings} onChange={setServings} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
            Ingredients
          </Text>
          {groupedIngredients.map((group, idx) => (
            <View key={idx}>
              {group.group && <IngredientGroupHeader label={group.group} />}
              {group.items.map((ing, i) => (
                <IngredientRow key={i} ingredient={ing} servingsMultiplier={multiplier} showGroup={false} />
              ))}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold, marginTop: 24 }]}>
            Instructions
          </Text>
          {recipe.instructions.map((step, idx) => (
            <InstructionStep key={idx} step={step} index={idx} total={recipe.instructions.length} />
          ))}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: HERO_HEIGHT },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroButtons: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 20 },
  title: { fontSize: 28, lineHeight: 34 },
  submitter: { fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  ratingSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 },
  servingsRow: { marginTop: 20 },
  sectionTitle: { fontSize: 19, marginTop: 24, marginBottom: 4 },
});
