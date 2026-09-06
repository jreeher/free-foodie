import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipeBooks } from '../../../lib/hooks/useRecipeBooks';
import { useRecipes } from '../../../lib/hooks/useRecipes';
import {
  usePublishBook,
  useArchiveListing,
  useListingForBook,
  useUploadMarketplaceCover,
} from '../../../lib/hooks/useMarketplace';
import { BOOK_PALETTE } from '../../../lib/theme';

const MAX_PRICE_CENTS = 1999;

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(s: string): number {
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.min(MAX_PRICE_CENTS, Math.max(0, Math.round(n * 100)));
}

export default function PublishScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors, typography, layout } = useTheme();

  const { data: books } = useRecipeBooks();
  const book = books?.find((b) => b.id === bookId);

  const { data: existingListing, isLoading: listingLoading } = useListingForBook(bookId);
  const { data: allRecipes } = useRecipes({ recipeIds: book?.recipe_ids ?? [] });

  const publish = usePublishBook();
  const archive = useArchiveListing();
  const uploadCover = useUploadMarketplaceCover();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('0.00');
  const [featuredRecipeId, setFeaturedRecipeId] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<'color' | 'image'>('color');
  const [coverColorIndex, setCoverColorIndex] = useState(0);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (existingListing) {
      setTitle(existingListing.title);
      setDescription(existingListing.description);
      setPriceDisplay(centsToDisplay(existingListing.price_cents));
      setFeaturedRecipeId(existingListing.featured_recipe_id);
      setCoverColorIndex(existingListing.cover_color_index);
      if (existingListing.cover_image_url) {
        setCoverMode('image');
        setCoverImageUrl(existingListing.cover_image_url);
      }
    } else if (book && !title) {
      setTitle(book.name);
    }
  }, [existingListing, book, title]);

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.85,
      allowsEditing: Platform.OS !== 'web',
      aspect: [3, 4],
    });
    if (!result.canceled) {
      setCoverImageUri(result.assets[0].uri);
      setCoverMode('image');
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for your listing.');
      return;
    }
    if (!bookId) return;

    let finalCoverImageUrl = coverImageUrl;
    if (coverMode === 'image' && coverImageUri) {
      try {
        finalCoverImageUrl = await uploadCover.mutateAsync(coverImageUri);
      } catch (e: any) {
        Alert.alert('Upload failed', e.message);
        return;
      }
    }

    publish.mutate({
      id: existingListing?.id,
      book_id: bookId,
      title: title.trim(),
      description: description.trim(),
      price_cents: displayToCents(priceDisplay),
      featured_recipe_id: featuredRecipeId,
      cover_color_index: coverColorIndex,
      cover_image_url: coverMode === 'image' ? finalCoverImageUrl : null,
    }, {
      onSuccess: () => router.back(),
    });
  };

  const handleArchive = () => {
    if (!existingListing) return;
    Alert.alert('Remove from Marketplace', 'This will hide your listing. You can re-publish it later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          archive.mutate(existingListing.id, { onSuccess: () => router.back() });
        }
      },
    ]);
  };

  const isBusy = publish.isPending || uploadCover.isPending || archive.isPending;

  if (listingLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
          {existingListing ? 'Edit Listing' : 'Publish to Marketplace'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: layout.screenPaddingH, gap: 24, paddingBottom: 60 }}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            LISTING TITLE
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Easy Weeknight Dinners"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            DESCRIPTION
          </Text>
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell buyers what makes this book special..."
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            PRICE (USD, $0.00 – $19.99)
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceDollar, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
              value={priceDisplay}
              onChangeText={setPriceDisplay}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            Set to $0.00 to offer this book for free.
          </Text>
        </View>

        {/* Cover */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            BOOK COVER
          </Text>
          <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.toggleOption, coverMode === 'color' && { backgroundColor: colors.primary }]}
              onPress={() => setCoverMode('color')}
            >
              <Text style={[styles.toggleText, { color: coverMode === 'color' ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Color
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, coverMode === 'image' && { backgroundColor: colors.primary }]}
              onPress={() => { setCoverMode('image'); pickCoverImage(); }}
            >
              <Text style={[styles.toggleText, { color: coverMode === 'image' ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Image
              </Text>
            </TouchableOpacity>
          </View>

          {coverMode === 'color' ? (
            <View style={styles.paletteRow}>
              {BOOK_PALETTE.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.swatch, { backgroundColor: p.cover, borderWidth: coverColorIndex === i ? 3 : 1, borderColor: coverColorIndex === i ? colors.primary : 'transparent' }]}
                  onPress={() => setCoverColorIndex(i)}
                />
              ))}
            </View>
          ) : (
            <TouchableOpacity style={[styles.imagePicker, { borderColor: colors.border }]} onPress={pickCoverImage}>
              {(coverImageUri || coverImageUrl) ? (
                <Image source={{ uri: coverImageUri ?? coverImageUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Camera color={colors.placeholder} size={24} strokeWidth={1.5} />
                    <ImageIcon color={colors.placeholder} size={24} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.imagePickerLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    Tap to upload cover image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Featured recipe */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            SAMPLE RECIPE (optional)
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            One recipe shown in full before purchase.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.recipeChip, { backgroundColor: featuredRecipeId === null ? colors.primary : 'transparent', borderColor: featuredRecipeId === null ? colors.primary : colors.border }]}
              onPress={() => setFeaturedRecipeId(null)}
            >
              <Text style={[styles.recipeChipText, { color: featuredRecipeId === null ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                None
              </Text>
            </TouchableOpacity>
            {(allRecipes ?? []).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.recipeChip, { backgroundColor: featuredRecipeId === r.id ? colors.primary : 'transparent', borderColor: featuredRecipeId === r.id ? colors.primary : colors.border }]}
                onPress={() => setFeaturedRecipeId(r.id)}
              >
                <Text style={[styles.recipeChipText, { color: featuredRecipeId === r.id ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  {r.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Publish button */}
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary, opacity: isBusy ? 0.6 : 1 }]}
          onPress={handlePublish}
          disabled={isBusy}
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={[styles.publishBtnText, { color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }]}>
                {existingListing ? 'Save Changes' : 'Publish'}
              </Text>
          }
        </TouchableOpacity>

        {existingListing && (
          <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
            <Text style={[styles.archiveBtnText, { color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium }]}>
              Remove from Marketplace
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  field: { gap: 6 },
  label: { fontSize: 11, letterSpacing: 0.5 },
  hint: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { height: 100, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceDollar: { fontSize: 20 },
  priceInput: { flex: 1 },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  toggleOption: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontSize: 14 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  swatch: { width: 40, height: 40, borderRadius: 6 },
  imagePicker: { height: 160, borderWidth: 2, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', marginTop: 8 },
  imagePickerLabel: { fontSize: 14 },
  recipeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  recipeChipText: { fontSize: 13 },
  publishBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  publishBtnText: { fontSize: 16 },
  archiveBtn: { alignItems: 'center', paddingVertical: 12 },
  archiveBtnText: { fontSize: 15 },
});
