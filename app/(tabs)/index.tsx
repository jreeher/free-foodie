import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus, BookOpen, ChevronRight, Check, Palette, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AddRecipeModal } from '../../components/recipe/AddRecipeModal';
import { BOOK_PALETTE, paletteIndexFromId, FAVORITES_PALETTE_INDEX } from '../../lib/theme';
import { useTheme } from '../../lib/hooks/useTheme';
import { useProfile } from '../../lib/hooks/useAuth';
import { useRecipes } from '../../lib/hooks/useRecipes';
import { useRecipeBooks, useCreateRecipeBook, useUpdateRecipeBookCover, useUploadBookCoverImage, RecipeBookWithCount } from '../../lib/hooks/useRecipeBooks';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { useToggleFavorite } from '../../lib/hooks/useRecipes';
import { Recipe } from '../../lib/database.types';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();
  const { data: allRecipes } = useRecipes();
  const { data: favoriteRecipes } = useRecipes({ favoritesOnly: true }, 'rating');
  const { data: books } = useRecipeBooks();
  const createBook = useCreateRecipeBook();
  const toggleFavorite = useToggleFavorite();

  const season = getCurrentSeason();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';

  // Seasonal: recipes tagged with current season
  const seasonalRecipes = allRecipes?.filter((r) =>
    r.season_tags?.includes(season)
  ) ?? [];

  // Cook again: recipes not cooked in 60+ days, or never cooked but added 30+ days ago
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cookAgainRecipes = (allRecipes ?? []).filter((r) => {
    if (r.last_cooked_at) {
      return now - new Date(r.last_cooked_at).getTime() > SIXTY_DAYS_MS;
    }
    // Never cooked but recipe is older than 30 days
    return now - new Date(r.created_at).getTime() > THIRTY_DAYS_MS;
  }).slice(0, 8);

  const updateCover = useUpdateRecipeBookCover();
  const uploadCoverImage = useUploadBookCoverImage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [colorPickerBook, setColorPickerBook] = useState<RecipeBookWithCount | null>(null);

  const handleToggleFavorite = (id: string, current: boolean) => {
    toggleFavorite.mutate({ id, isFavorite: current });
  };

  const handleCreateBook = () => {
    const name = newBookName.trim();
    if (!name) return;
    createBook.mutate(name, {
      onSuccess: () => {
        setNewBookName('');
        setShowCreateBook(false);
      },
    });
  };

  const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

  return (
    <ErrorBoundary>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
          <View>
            <Text
              style={[
                styles.greeting,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              {getGreeting()}, {firstName}
            </Text>
            <Text
              style={[
                styles.date,
                { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
              ]}
            >
              {formatDate(new Date())}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={[styles.quickActions, { paddingHorizontal: layout.screenPaddingH }]}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/recipes')}
          >
            <BookOpen color={colors.primary} size={22} strokeWidth={1.5} />
            <Text style={[styles.quickLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
              {allRecipes?.length ?? 0} Recipes
            </Text>
            <Text style={[styles.quickSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Browse all
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/recipes', { relativeToDirectory: false })}
          >
            <Text style={{ fontSize: 22 }}>❤️</Text>
            <Text style={[styles.quickLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
              {favoriteRecipes?.length ?? 0} Favorites
            </Text>
            <Text style={[styles.quickSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Your saved picks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seasonal picks */}
        {seasonalRecipes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={`${seasonLabel} picks`}
              onViewAll={() => router.push('/(tabs)/recipes')}
              colors={colors}
              typography={typography}
              layout={layout}
            />
            <FlatList
              data={seasonalRecipes.slice(0, 8)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: 12 }}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  onToggleFavorite={handleToggleFavorite}
                  width={180}
                />
              )}
            />
          </View>
        )}

        {/* Recipe Books */}
        {books && books.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Your Recipe Books"
              onAdd={() => setShowCreateBook(true)}
              colors={colors}
              typography={typography}
              layout={layout}
            />
            <View style={[styles.booksGrid, { paddingHorizontal: layout.screenPaddingH }]}>
              {books.map((book) => {
                const paletteIndex = book.cover_color_index != null
                  ? book.cover_color_index
                  : book.is_default
                  ? FAVORITES_PALETTE_INDEX
                  : paletteIndexFromId(book.id);
                const palette = BOOK_PALETTE[paletteIndex];
                const hasImage = !!book.cover_image_url;
                const textColor = hasImage ? '#fff' : palette.text;
                return (
                  <TouchableOpacity
                    key={book.id}
                    style={[styles.bookCard, { backgroundColor: hasImage ? '#333' : palette.cover }]}
                    onPress={() => router.push({ pathname: '/(tabs)/recipes', params: { bookId: book.id, bookName: book.name } })}
                    onLongPress={() => setColorPickerBook(book)}
                    activeOpacity={0.85}
                  >
                    {hasImage ? (
                      <>
                        <Image source={{ uri: book.cover_image_url! }} style={[StyleSheet.absoluteFill, styles.bookCoverImage]} contentFit="cover" />
                        <View style={styles.bookCoverImageOverlay} />
                        <View style={[styles.bookCover, { justifyContent: 'flex-end' }]}>
                          <Text style={[styles.bookCardName, { color: textColor, fontFamily: typography.fontFamilies.serifDisplayItalic, flex: 0, marginBottom: 6 }]} numberOfLines={2}>
                            {book.name}
                          </Text>
                          <View style={styles.bookCardFooter}>
                            <Text style={[styles.bookCardCount, { color: textColor, fontFamily: typography.fontFamilies.sansRegular, opacity: 0.85 }]}>
                              {book.recipe_count} {book.recipe_count === 1 ? 'recipe' : 'recipes'}
                            </Text>
                            <TouchableOpacity
                              style={[styles.colorBtn, { backgroundColor: 'rgba(0,0,0,0.40)' }]}
                              onPress={(e) => { e.stopPropagation?.(); setColorPickerBook(book); }}
                              hitSlop={4}
                            >
                              <ImageIcon size={11} color={textColor} strokeWidth={2} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </>
                    ) : (
                      <>
                        {/* Spine strip */}
                        <View style={[styles.bookSpine, { backgroundColor: palette.spine }]} />

                        {/* Cover content */}
                        <View style={styles.bookCover}>
                          {/* Decorative top lines */}
                          <View style={styles.bookLines}>
                            <View style={[styles.bookLine, { backgroundColor: palette.text, opacity: 0.25 }]} />
                            <View style={[styles.bookLine, styles.bookLineShort, { backgroundColor: palette.text, opacity: 0.15 }]} />
                          </View>

                          {/* Title */}
                          <Text
                            style={[styles.bookCardName, { color: palette.text, fontFamily: typography.fontFamilies.serifDisplayItalic }]}
                            numberOfLines={3}
                          >
                            {book.name}
                          </Text>

                          {/* Recipe count + color button row */}
                          <View style={styles.bookCardFooter}>
                            <Text style={[styles.bookCardCount, { color: palette.text, fontFamily: typography.fontFamilies.sansRegular, opacity: 0.7 }]}>
                              {book.recipe_count} {book.recipe_count === 1 ? 'recipe' : 'recipes'}
                            </Text>
                            <TouchableOpacity
                              style={[styles.colorBtn, { backgroundColor: 'rgba(0,0,0,0.20)' }]}
                              onPress={(e) => { e.stopPropagation?.(); setColorPickerBook(book); }}
                              hitSlop={4}
                            >
                              <Palette size={11} color={palette.text} strokeWidth={2} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Favorites */}
        {(favoriteRecipes?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Your favorites"
              onViewAll={() => router.push('/(tabs)/recipes')}
              colors={colors}
              typography={typography}
              layout={layout}
            />
            <FlatList
              data={favoriteRecipes!.slice(0, 8)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: 12 }}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  onToggleFavorite={handleToggleFavorite}
                  width={180}
                />
              )}
            />
          </View>
        )}

        {/* Cook again */}
        {cookAgainRecipes.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Time for a comeback"
              subtitle="You haven't made these in a while"
              onViewAll={() => router.push('/(tabs)/recipes')}
              colors={colors}
              typography={typography}
              layout={layout}
            />
            <FlatList
              data={cookAgainRecipes}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: 12 }}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  onToggleFavorite={handleToggleFavorite}
                  width={180}
                />
              )}
            />
          </View>
        )}

        {/* Empty state */}
        {!allRecipes?.length && (
          <View style={[styles.emptyState, { paddingHorizontal: layout.screenPaddingH }]}>
            <Text style={{ fontSize: 48 }}>🥘</Text>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
              ]}
            >
              Your kitchen awaits
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              Add your first recipe to get started building your collection.
            </Text>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Plus color="#fff" size={18} strokeWidth={2.5} />
              <Text
                style={[
                  styles.ctaText,
                  { fontFamily: typography.fontFamilies.sansSemiBold },
                ]}
              >
                Add your first recipe
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <AddRecipeModal visible={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Color picker modal for book covers */}
      <Modal
        visible={!!colorPickerBook}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerBook(null)}
      >
        <KeyboardAvoidingView
          style={colorPickerStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setColorPickerBook(null)}
          />
          <View style={[colorPickerStyles.card, { backgroundColor: colors.surface }]}>
            <Text style={[colorPickerStyles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Book Color
            </Text>
            <Text style={[colorPickerStyles.subtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Choose a color for "{colorPickerBook?.name}"
            </Text>
            <View style={colorPickerStyles.swatchGrid}>
              {BOOK_PALETTE.map((p, i) => {
                const currentIndex = colorPickerBook?.cover_color_index != null
                  ? colorPickerBook.cover_color_index
                  : colorPickerBook?.is_default
                  ? FAVORITES_PALETTE_INDEX
                  : paletteIndexFromId(colorPickerBook?.id ?? '');
                const isSelected = i === currentIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[colorPickerStyles.swatch, { backgroundColor: p.cover }, isSelected && colorPickerStyles.swatchSelected]}
                    onPress={() => {
                      if (!colorPickerBook) return;
                      updateCover.mutate({ id: colorPickerBook.id, cover_color_index: i });
                      setColorPickerBook(null);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={16} color={p.text} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Upload Image button */}
            <TouchableOpacity
              style={[colorPickerStyles.uploadBtn, { borderColor: colors.primary, opacity: uploadCoverImage.isPending ? 0.6 : 1 }]}
              disabled={uploadCoverImage.isPending}
              onPress={async () => {
                if (!colorPickerBook) return;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'] as any,
                  quality: 0.85,
                  allowsEditing: Platform.OS !== 'web',
                });
                if (result.canceled || !result.assets?.[0]?.uri) return;
                uploadCoverImage.mutate({ bookId: colorPickerBook.id, uri: result.assets[0].uri });
                setColorPickerBook(null);
              }}
            >
              {uploadCoverImage.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <ImageIcon size={15} color={colors.primary} strokeWidth={2} />
                  <Text style={[colorPickerStyles.uploadText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    Upload Image
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Remove image (shown when a custom image is set) */}
            {colorPickerBook?.cover_image_url && (
              <TouchableOpacity
                style={[colorPickerStyles.resetBtn, { borderColor: colors.border }]}
                onPress={() => {
                  if (!colorPickerBook) return;
                  updateCover.mutate({ id: colorPickerBook.id, cover_color_index: null, cover_image_url: null });
                  setColorPickerBook(null);
                }}
              >
                <Text style={[colorPickerStyles.resetText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Remove image
                </Text>
              </TouchableOpacity>
            )}

            {/* Reset color to default (shown when a custom color is set and no image) */}
            {colorPickerBook?.cover_color_index != null && !colorPickerBook?.cover_image_url && (
              <TouchableOpacity
                style={[colorPickerStyles.resetBtn, { borderColor: colors.border }]}
                onPress={() => {
                  if (!colorPickerBook) return;
                  updateCover.mutate({ id: colorPickerBook.id, cover_color_index: null });
                  setColorPickerBook(null);
                }}
              >
                <Text style={[colorPickerStyles.resetText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  Reset to default
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Recipe Book modal */}
      <Modal
        visible={showCreateBook}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateBook(false)}
      >
        <KeyboardAvoidingView
          style={createBookStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowCreateBook(false); setNewBookName(''); }}
          />
          <View style={[createBookStyles.card, { backgroundColor: colors.surface }]}>
            <Text style={[createBookStyles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              New Recipe Book
            </Text>
            <TextInput
              style={[createBookStyles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
              placeholder="Book name"
              placeholderTextColor={colors.placeholder}
              value={newBookName}
              onChangeText={setNewBookName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateBook}
            />
            <View style={createBookStyles.row}>
              <TouchableOpacity
                style={[createBookStyles.btn, { borderColor: colors.border }]}
                onPress={() => { setShowCreateBook(false); setNewBookName(''); }}
              >
                <Text style={[createBookStyles.btnText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[createBookStyles.btn, createBookStyles.btnPrimary, { backgroundColor: colors.primary, opacity: newBookName.trim() ? 1 : 0.45 }]}
                onPress={handleCreateBook}
                disabled={!newBookName.trim() || createBook.isPending}
              >
                {createBook.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[createBookStyles.btnText, { color: '#fff', fontFamily: typography.fontFamilies.sansMedium }]}>Create</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

function SectionHeader({
  title,
  subtitle,
  onViewAll,
  onAdd,
  colors,
  typography,
  layout,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  onAdd?: () => void;
  colors: any;
  typography: any;
  layout: any;
}) {
  return (
    <View style={[sectionStyles.header, { paddingHorizontal: layout.screenPaddingH }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            sectionStyles.title,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              sectionStyles.subtitle,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          style={[sectionStyles.addBtn, { backgroundColor: colors.primary }]}
          hitSlop={8}
        >
          <Plus color="#fff" size={16} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      {onViewAll && !onAdd && (
        <TouchableOpacity onPress={onViewAll} style={sectionStyles.viewAll} hitSlop={8}>
          <Text
            style={[
              sectionStyles.viewAllText,
              { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium },
            ]}
          >
            See all
          </Text>
          <ChevronRight color={colors.primary} size={14} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 18 },
  subtitle: { fontSize: 12, marginTop: 1 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 14 },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: { fontSize: 15, marginBottom: 4 },
  date: { fontSize: 26, lineHeight: 32 },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  quickLabel: { fontSize: 16 },
  quickSub: { fontSize: 13 },
  section: {
    marginBottom: 28,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  bookCard: {
    width: '47%',
    height: 160,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    // Subtle drop shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  bookSpine: {
    width: 10,
    height: '100%',
  },
  bookCover: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  bookLines: {
    gap: 4,
    marginBottom: 8,
  },
  bookLine: {
    height: 1.5,
    borderRadius: 1,
  },
  bookLineShort: {
    width: '55%',
  },
  bookCardName: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  bookCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bookCardCount: { fontSize: 11, letterSpacing: 0.3 },
  bookCoverImage: { borderRadius: 8 },
  bookCoverImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 8,
  },
  colorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  colorBtnText: { fontSize: 10, opacity: 0.85 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 24, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontSize: 15 },
  bottomPad: { height: 20 },
});

const colorPickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 22 },
  subtitle: { fontSize: 14, marginTop: -4 },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  uploadText: { fontSize: 14 },
  resetBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  resetText: { fontSize: 14 },
});

const createBookStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 15,
  },
});
