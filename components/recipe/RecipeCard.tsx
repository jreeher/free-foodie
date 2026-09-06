import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock, ChefHat, Star } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { RecipeWithMeta } from '../../lib/hooks/useRecipes';
import { SKILL_LEVEL_LABELS } from '../../lib/theme';
import { Badge } from '../ui/Badge';

interface RecipeCardProps {
  recipe: RecipeWithMeta;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { colors, typography, layout, shadows } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: recipe.id } })}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: layout.cardRadius, ...shadows.card },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.skeleton }]}>
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.placeholderIcon}>
            <ChefHat color={colors.textSecondary} size={28} strokeWidth={1.5} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <View style={styles.metaRow}>
          {recipe.cook_time_minutes ? (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {recipe.cook_time_minutes} min
              </Text>
            </View>
          ) : null}
          {recipe.avgRating != null ? (
            <View style={styles.metaItem}>
              <Star size={12} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {recipe.avgRating.toFixed(1)} ({recipe.ratingCount})
              </Text>
            </View>
          ) : null}
        </View>

        {recipe.skill_level ? (
          <Badge label={SKILL_LEVEL_LABELS[recipe.skill_level]} variant="outline" style={styles.badge} />
        ) : null}

        {recipe.submitterName ? (
          <Text
            style={[styles.submitter, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}
            numberOfLines={1}
          >
            by {recipe.submitterName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  imageWrap: {
    aspectRatio: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    opacity: 0.5,
  },
  body: {
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  submitter: {
    fontSize: 11,
  },
});
