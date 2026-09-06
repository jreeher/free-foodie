import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BookOpen, Plus, X, Star } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useMarketplaceListings, useMyPurchasedListingIds, ListingFilter } from '../../../lib/hooks/useMarketplace';
import { useRecipeBooks } from '../../../lib/hooks/useRecipeBooks';
import { BOOK_PALETTE, paletteIndexFromId } from '../../../lib/theme';
import { MarketplaceListingDetail } from '../../../lib/database.types';

function priceLabel(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}

function ListingCard({ listing, owned, onPress }: { listing: MarketplaceListingDetail; owned: boolean; onPress: () => void }) {
  const { colors, typography } = useTheme();
  const palette = listing.cover_image_url
    ? null
    : BOOK_PALETTE[listing.cover_color_index ?? paletteIndexFromId(listing.id)];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardCover, { backgroundColor: palette?.cover ?? '#888' }]}>
        {listing.cover_image_url ? (
          <Image source={{ uri: listing.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <View style={[styles.cardSpine, { backgroundColor: palette!.spine }]} />
            <View style={styles.cardCoverContent}>
              <Text style={[styles.cardTitle, { color: palette!.text, fontFamily: typography.fontFamilies.serifDisplayItalic }]} numberOfLines={3}>
                {listing.title}
              </Text>
              <Text style={[styles.cardCount, { color: palette!.text, fontFamily: typography.fontFamilies.sansRegular }]}>
                {listing.recipe_count} {listing.recipe_count === 1 ? 'recipe' : 'recipes'}
              </Text>
            </View>
          </>
        )}
        {owned ? (
          <View style={[styles.priceBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.priceText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansBold }]}>
              In library
            </Text>
          </View>
        ) : (
          <View style={[styles.priceBadge, { backgroundColor: listing.price_cents === 0 ? '#2ECC71' : colors.primary }]}>
            <Text style={[styles.priceText, { color: '#fff', fontFamily: typography.fontFamilies.sansBold }]}>
              {priceLabel(listing.price_cents)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.sellerName, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]} numberOfLines={1}>
          by {listing.seller_name}
        </Text>
        {listing.rating_count > 0 && (
          <View style={styles.ratingBadge}>
            <Star size={10} color="#F39C12" fill="#F39C12" strokeWidth={1.5} />
            <Text style={[styles.ratingBadgeText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              {listing.avg_rating!.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const FILTERS: { label: string; value: ListingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
];

export default function MarketplaceBrowseScreen() {
  const { colors, typography, layout } = useTheme();
  const [filter, setFilter] = useState<ListingFilter>('all');
  const { data: listings, isLoading } = useMarketplaceListings(filter);
  const purchasedIds = useMyPurchasedListingIds();
  const { data: myBooks } = useRecipeBooks();
  const [showBookPicker, setShowBookPicker] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Marketplace
        </Text>
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowBookPicker(true)}
        >
          <Plus color="#fff" size={14} strokeWidth={2.5} />
          <Text style={[styles.publishBtnText, { fontFamily: typography.fontFamilies.sansMedium }]}>
            Publish a Book
          </Text>
        </TouchableOpacity>
      </View>

      {/* Book picker modal */}
      <Modal visible={showBookPicker} transparent animationType="slide" onRequestClose={() => setShowBookPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBookPicker(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Choose a Recipe Book
            </Text>
            <TouchableOpacity onPress={() => setShowBookPicker(false)} hitSlop={8}>
              <X color={colors.textSecondary} size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {(myBooks ?? []).filter(b => !b.is_default || b.sort_order !== 0).map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowBookPicker(false);
                  router.push({ pathname: '/(tabs)/marketplace/publish', params: { bookId: book.id } });
                }}
              >
                <BookOpen color={colors.primary} size={18} strokeWidth={1.75} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookRowName, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    {book.name}
                  </Text>
                  <Text style={[styles.bookRowCount, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {book.recipe_count} {book.recipe_count === 1 ? 'recipe' : 'recipes'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterChip, { backgroundColor: filter === f.value ? colors.primary : 'transparent', borderColor: filter === f.value ? colors.primary : colors.border }]}
          >
            <Text style={[styles.filterChipText, { color: filter === f.value ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !listings?.length ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            No books yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            Be the first to publish a recipe book!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: layout.screenPaddingH, gap: 16 }}
          columnWrapperStyle={{ gap: 16 }}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              owned={purchasedIds.has(item.id)}
              onPress={() => router.push({ pathname: '/(tabs)/marketplace/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 28 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  publishBtnText: { color: '#fff', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, maxHeight: '70%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 22 },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  bookRowName: { fontSize: 15 },
  bookRowCount: { fontSize: 12, marginTop: 2 },
  filterBar: { paddingVertical: 12, borderBottomWidth: 1, flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 24, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: { flex: 1 },
  cardCover: {
    height: 180, borderRadius: 8, overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 6, elevation: 5,
    position: 'relative',
  },
  cardSpine: { width: 10, height: '100%' },
  cardCoverContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, lineHeight: 21, flex: 1 },
  cardCount: { fontSize: 11, opacity: 0.7 },
  priceBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  priceText: { fontSize: 11 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sellerName: { fontSize: 12, flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingBadgeText: { fontSize: 11 },
});
