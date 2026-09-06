import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Link, Camera, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { importFromUrl, importFromImage, uriToBase64, ImportedRecipe } from '../../../lib/api/importRecipe';

type Tab = 'url' | 'photo';

export default function ImportRecipeScreen() {
  const { colors, typography, layout } = useTheme();
  const { tab } = useLocalSearchParams<{ tab?: Tab }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab === 'photo' ? 'photo' : 'url');
  const [url, setUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleUrlImport = async () => {
    if (!url.trim()) {
      Alert.alert('No URL', 'Please paste a recipe URL.');
      return;
    }
    if (!url.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Fetching recipe...');

    try {
      setTimeout(() => setLoadingMessage('Reading ingredients...'), 3000);
      setTimeout(() => setLoadingMessage('Cleaning up with AI...'), 6000);

      const result = await importFromUrl(url.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.push({
        pathname: '/(tabs)/recipes/import-review',
        params: { data: JSON.stringify(result) },
      });
    } catch (err: any) {
      Alert.alert('Import failed', err.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    const useCamera = fromCamera && Platform.OS !== 'web';
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: false, base64: false });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handlePhotoImport = async () => {
    if (!imageUri) {
      Alert.alert('No photo', 'Please select or take a photo first.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Reading your photo...');

    try {
      setTimeout(() => setLoadingMessage('Extracting recipe...'), 3000);
      setTimeout(() => setLoadingMessage('Cleaning up with AI...'), 7000);

      const { base64, mediaType, compressedUri } = await uriToBase64(imageUri);
      const result = await importFromImage(base64, mediaType);
      result.source_url = undefined; // Photo imports don't have a source URL

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.push({
        pathname: '/(tabs)/recipes/import-review',
        params: {
          data: JSON.stringify(result),
          imageUri: compressedUri, // always a file:// URI, safe for FileSystem
        },
      });
    } catch (err: any) {
      Alert.alert('Import failed', err.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            Import Recipe
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {(['url', 'photo'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'url'
                ? <Link color={activeTab === tab ? colors.primary : colors.textSecondary} size={18} strokeWidth={2} />
                : <Camera color={activeTab === tab ? colors.primary : colors.textSecondary} size={18} strokeWidth={2} />
              }
              <Text style={[
                styles.tabLabel,
                {
                  color: activeTab === tab ? colors.primary : colors.textSecondary,
                  fontFamily: typography.fontFamilies.sansMedium,
                },
              ]}>
                {tab === 'url' ? 'From URL' : 'From Photo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* AI badge */}
          <View style={[styles.aiBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Sparkles color={colors.primary} size={16} strokeWidth={2} />
            <Text style={[styles.aiBadgeText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
              Powered by Claude AI — blog filler removed automatically
            </Text>
          </View>

          {activeTab === 'url' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
                Paste a recipe URL
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Works with any recipe website. The AI will extract just the recipe and strip out the story about grandma's kitchen.
              </Text>

              <TextInput
                style={[
                  styles.urlInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    fontFamily: typography.fontFamilies.sansRegular,
                  },
                ]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://www.example.com/recipe..."
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <TouchableOpacity
                style={[
                  styles.importButton,
                  { backgroundColor: colors.primary },
                  (loading || !url.trim()) && { opacity: 0.6 },
                ]}
                onPress={handleUrlImport}
                disabled={loading || !url.trim()}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.importButtonText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      {loadingMessage}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Sparkles color="#fff" size={18} strokeWidth={2} />
                    <Text style={[styles.importButtonText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Import Recipe
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Tips */}
              <View style={[styles.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.tipsTitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  WORKS GREAT WITH
                </Text>
                {[
                  'AllRecipes, Food Network, NYT Cooking',
                  'Serious Eats, Bon Appetit, Epicurious',
                  'Any food blog URL',
                  'Instagram or TikTok recipe links',
                ].map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: colors.secondary }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
                Photograph a recipe
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Take a photo of a cookbook page, recipe card, or handwritten note. Claude will extract and clean it up.
              </Text>

              {/* Image preview / picker */}
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={[styles.changePhotoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setImageUri(null)}
                  >
                    <Text style={[styles.changePhotoText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                      Change photo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoOptions}>
                  <TouchableOpacity
                    style={[styles.photoOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => pickImage(true)}
                  >
                    <Camera color={colors.primary} size={28} strokeWidth={1.5} />
                    <Text style={[styles.photoOptionLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Take Photo
                    </Text>
                    <Text style={[styles.photoOptionSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      Use your camera
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => pickImage(false)}
                  >
                    <ImageIcon color={colors.primary} size={28} strokeWidth={1.5} />
                    <Text style={[styles.photoOptionLabel, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Choose Photo
                    </Text>
                    <Text style={[styles.photoOptionSub, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      From your library
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.importButton,
                  { backgroundColor: colors.primary },
                  (loading || !imageUri) && { opacity: 0.6 },
                ]}
                onPress={handlePhotoImport}
                disabled={loading || !imageUri}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.importButtonText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      {loadingMessage}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Sparkles color="#fff" size={18} strokeWidth={2} />
                    <Text style={[styles.importButtonText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Extract Recipe
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.tipsTitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  TIPS FOR BEST RESULTS
                </Text>
                {[
                  'Good lighting — avoid shadows on the page',
                  'Hold the camera steady and close enough to read text',
                  'Works with printed and handwritten recipes',
                  'One recipe per photo',
                ].map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: colors.secondary }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 60 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  aiBadgeText: { fontSize: 13, flex: 1 },
  section: { gap: 16 },
  sectionTitle: { fontSize: 26, lineHeight: 32 },
  sectionSubtitle: { fontSize: 15, lineHeight: 22, opacity: 0.85, marginTop: -8 },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 50,
  },
  importButton: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  tipsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: { fontSize: 14, lineHeight: 20, flex: 1 },
  photoOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoOption: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  photoOptionLabel: { fontSize: 15 },
  photoOptionSub: { fontSize: 13, textAlign: 'center' },
  imagePreviewContainer: {
    gap: 10,
  },
  imagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  changePhotoButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  changePhotoText: { fontSize: 14 },
});
