import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChefHat, Star } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useMarketplaceListing,
  useHasPurchased,
  useClaimFreeBook,
  useMarketplaceRating,
  useRateMarketplaceListing,
} from '../../../lib/hooks/useMarketplace';
import { BOOK_PALETTE, paletteIndexFromId } from '../../../lib/theme';

function priceLabel(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}

export default function MarketplaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const { data: listing, isLoading } = useMarketplaceListing(id);
  const { data: hasPurchased, isLoading: purchaseLoading } = useHasPurchased(id);
  const { data: rating } = useMarketplaceRating(id);
  const claimFree = useClaimFreeBook();
  const rateBook = useRateMarketplaceListing();

  if (isLoading || !listing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const palette = listing.cover_image_url
    ? null
    : BOOK_PALETTE[listing.cover_color_index ?? paletteIndexFromId(listing.id)];

  const handleClaim = () => {
    claimFree.mutate(listing.id);
  };

  const handleBuy = () => {
    Alert.alert('Coming Soon', 'Paid purchases will be available once our payment system is set up. Check back soon!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.nav, { borderBottomColor: colors.border, paddingHorizontal: layout.screenPaddingH }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Cover */}
        <View style={[styles.coverBlock, { backgroundColor: palette?.cover ?? '#888' }]}>
          {listing.cover_image_url ? (
            <Image source={{ uri: listing.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[styles.coverSpine, { backgroundColor: palette!.spine }]} />
          )}
          <View style={styles.coverOverlay}>
            <Text style={[styles.coverTitle, { color: listing.cover_image_url ? '#fff' : palette!.text, fontFamily: typography.fontFamilies.serifDisplayItalic }]}>
              {listing.title}
            </Text>
            <Text style={[styles.coverSeller, { color: listing.cover_image_url ? 'rgba(255,255,255,0.8)' : palette!.text, fontFamily: typography.fontFamilies.sansRegular }]}>
              by {listing.seller_name}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: layout.screenPaddingH, paddingTop: 24, gap: 24 }}>
          {/* Price + CTA */}
          <View style={styles.ctaRow}>
            <View>
              <Text style={[styles.priceLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Price
              </Text>
              <Text style={[styles.priceValue, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                {priceLabel(listing.price_cents)}
              </Text>
            </View>
            {purchaseLoading ? (
              <View style={[styles.ctaButton, { backgroundColor: colors.border }]}>
                <ActivityIndicator color={colors.textSecondary} size="small" />
              </View>
            ) : hasPurchased ? (
              <View style={[styles.ctaButton, { backgroundColor: colors.border }]}>
                <Text style={[styles.ctaButtonText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  In your library
                </Text>
              </View>
            ) : listing.price_cents === 0 ? (
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#2ECC71', opacity: claimFree.isPending ? 0.6 : 1 }]}
                onPress={handleClaim}
                disabled={claimFree.isPending}
              >
                {claimFree.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.ctaButtonText, { color: '#fff', fontFamily: typography.fontFamilies.sansMedium }]}>Claim for Free</Text>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={handleBuy}
              >
                <Text style={[styles.ctaButtonText, { color: '#fff', fontFamily: typography.fontFamilies.sansMedium }]}>
                  Buy for {priceLabel(listing.price_cents)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Ratings */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
              Ratings
            </Text>
            <View style={styles.ratingRow}>
              {/* Average display */}
              <View style={styles.ratingAvgBlock}>
                <Text style={[styles.ratingAvgNumber, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                  {rating && rating.count > 0 ? rating.average.toFixed(1) : '—'}
                </Text>
                <View style={styles.ratingStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      color="#F39C12"
                      strokeWidth={1.5}
                      fill={rating && s <= Math.round(rating.average) ? '#F39C12' : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={[styles.ratingCount, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  {rating?.count ?? 0} {rating?.count === 1 ? 'rating' : 'ratings'}
                </Text>
              </View>

              {/* User's own star rating */}
              <View style={styles.userRatingBlock}>
                <Text style={[styles.userRatingLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Your rating
                </Text>
                <View style={styles.ratingStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => rateBook.mutate({ listingId: id, rating: s })}
                      hitSlop={6}
                    >
                      <Star
                        size={26}
                        color={colors.primary}
                        strokeWidth={1.5}
                        fill={rating?.userRating != null && s <= rating.userRating ? colors.primary : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          {!!listing.description && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                About this book
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {listing.description}
              </Text>
            </View>
          )}

          {/* Recipe list */}
          {listing.recipe_titles.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                {listing.recipe_count} Recipes
              </Text>
              {listing.recipe_titles.map((title, i) => (
                <View key={i} style={[styles.recipeRow, { borderBottomColor: colors.border }]}>
                  <ChefHat color={colors.textSecondary} size={14} strokeWidth={1.5} />
                  <Text style={[styles.recipeTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Featured recipe */}
          {listing.featured_recipe && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                Sample Recipe
              </Text>
              <View style={[styles.sampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sampleRecipeTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
                  {listing.featured_recipe.title}
                </Text>
                {!!listing.featured_recipe.description && (
                  <Text style={[styles.sampleRecipeDesc, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {listing.featured_recipe.description}
                  </Text>
                )}
                {listing.featured_recipe.ingredients?.length > 0 && (
                  <>
                    <Text style={[styles.sampleSubtitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Ingredients
                    </Text>
                    {listing.featured_recipe.ingredients.map((ing, i) => (
                      <Text key={i} style={[styles.sampleLine, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                        • {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
                      </Text>
                    ))}
                  </>
                )}
                {listing.featured_recipe.instructions?.length > 0 && (
                  <>
                    <Text style={[styles.sampleSubtitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Instructions
                    </Text>
                    {listing.featured_recipe.instructions.map((step, i) => (
                      <Text key={i} style={[styles.sampleLine, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  coverBlock: { height: 240, flexDirection: 'row', position: 'relative' },
  coverSpine: { width: 14, height: '100%' },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    // Gradient scrim so title/seller text is readable over any image
    ...(({ background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' } as any)),
  },
  coverTitle: { fontSize: 28, lineHeight: 36 },
  coverSeller: { fontSize: 14, marginTop: 4 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, marginBottom: 2 },
  priceValue: { fontSize: 24 },
  ctaButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 140, alignItems: 'center' },
  ctaButtonText: { fontSize: 15 },
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  ratingAvgBlock: { alignItems: 'center', gap: 4 },
  ratingAvgNumber: { fontSize: 36, lineHeight: 40 },
  ratingStarsRow: { flexDirection: 'row', gap: 3 },
  ratingCount: { fontSize: 12, marginTop: 2 },
  userRatingBlock: { flex: 1, gap: 8 },
  userRatingLabel: { fontSize: 13 },
  description: { fontSize: 15, lineHeight: 23 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  recipeTitle: { fontSize: 14, flex: 1 },
  sampleCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  sampleRecipeTitle: { fontSize: 20, marginBottom: 4 },
  sampleRecipeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sampleSubtitle: { fontSize: 14, marginTop: 8, marginBottom: 4 },
  sampleLine: { fontSize: 14, lineHeight: 20 },
});
