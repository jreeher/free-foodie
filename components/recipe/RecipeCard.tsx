import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/hooks/useTheme';
import { Recipe } from '../../lib/database.types';
import { StarRating } from '../ui/StarRating';
import { Badge } from '../ui/Badge';
import { formatTime } from '../../lib/utils/fractions';

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite?: (id: string, current: boolean) => void;
  width?: number | string;
}

// On web, Dimensions returns the full browser window width (e.g. 1440px), not the
// constrained column width — so we fall back to '100%' and let the flex wrapper size us.
const SCREEN_W = Dimensions.get('window').width;
const CARD_WIDTH: number | string =
  Platform.OS === 'web' ? '100%' : (SCREEN_W - 20 * 2 - 12) / 2;

export function RecipeCard({ recipe, onToggleFavorite, width = CARD_WIDTH }: RecipeCardProps) {
  const { colors, typography, layout } = useTheme();

  const handlePress = () => {
    router.push(`/(tabs)/recipes/${recipe.id}`);
  };

  const handleFavorite = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleFavorite?.(recipe.id, recipe.is_favorite);
  };

  const totalTime = recipe.total_time_minutes ?? recipe.cook_time_minutes;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width,
          backgroundColor: colors.surface,
          borderRadius: layout.cardRadius,
          ...{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          },
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={[styles.imageContainer, { borderRadius: layout.imageRadius }]}>
        {recipe.image_url ? (
          <>
            <Image
              source={{ uri: recipe.image_url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)']}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.primary + '12' }]}>
            <Image
              source={require('../../assets/app-icon.png')}
              style={styles.placeholderIcon}
              contentFit="contain"
            />
          </View>
        )}
        {/* Favorite button */}
        <TouchableOpacity
          style={[
            styles.heartButton,
            { backgroundColor: recipe.image_url ? 'rgba(0,0,0,0.3)' : colors.surface },
          ]}
          onPress={handleFavorite}
          hitSlop={8}
        >
          <Heart
            size={18}
            color={recipe.is_favorite ? '#E74C3C' : recipe.image_url ? 'rgba(255,255,255,0.9)' : colors.textSecondary}
            fill={recipe.is_favorite ? '#E74C3C' : 'transparent'}
            strokeWidth={2}
          />
        </TouchableOpacity>
        {/* Time badge */}
        {totalTime ? (
          <View
            style={[
              styles.timeBadge,
              { backgroundColor: 'rgba(0,0,0,0.55)' },
            ]}
          >
            <Clock size={10} color="#fff" strokeWidth={2} />
            <Text style={styles.timeBadgeText}>{formatTime(totalTime)}</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold },
          ]}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>
        <View style={styles.meta}>
          <StarRating value={recipe.rating} readonly size={13} />
          {recipe.categories[0] ? (
            <Badge
              label={recipe.categories[0]}
              variant="muted"
              style={styles.categoryBadge}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: '65%',
    height: '65%',
    opacity: 0.55,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 3,
  },
  timeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: undefined, // will be sans
    fontWeight: '500',
  },
  content: {
    padding: 10,
    gap: 5,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
