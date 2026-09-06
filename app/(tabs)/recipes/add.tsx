import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus,
  Minus,
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  GripVertical,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useCreateRecipe,
  useCategories,
  useTags,
  useUploadRecipeImage,
} from '../../../lib/hooks/useRecipes';
import { useRecipeBooks, useAddRecipeToBook } from '../../../lib/hooks/useRecipeBooks';
import { Ingredient } from '../../../lib/database.types';
import { AISLE_CATEGORIES, AisleCategory, MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MealType } from '../../../lib/theme';
import { guessAisleCategory } from '../../../lib/utils/ingredients';

interface FormIngredient extends Partial<Ingredient> {
  key: string;
}

const EMPTY_INGREDIENT = (): FormIngredient => ({
  key: String(Date.now() + Math.random()),
  name: '',
  amount: '',
  unit: '',
  aisle_category: 'Other',
});

export default function AddRecipeScreen() {
  const { colors, typography, layout } = useTheme();
  const createRecipe = useCreateRecipe();
  const uploadImage = useUploadRecipeImage();
  const addToBook = useAddRecipeToBook();
  const { data: categories } = useCategories();
  const { data: allTags } = useTags();
  const { data: recipeBooks } = useRecipeBooks();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredients, setIngredients] = useState<FormIngredient[]>([EMPTY_INGREDIENT()]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSeasonTags, setSelectedSeasonTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [activeIngredientPicker, setActiveIngredientPicker] = useState<string | null>(null);

  const navigation = useNavigation();
  // Tracks when we're intentionally navigating away after a successful save,
  // so the beforeRemove guard doesn't re-trigger the alert.
  const isSavingRef = useRef(false);

  const isDirty =
    title.trim() !== '' ||
    description.trim() !== '' ||
    ingredients.some((i) => i.name?.trim()) ||
    instructions.some((s) => s.trim() !== '');

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as any, (e: any) => {
      if (!isDirty || isSavingRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved Recipe',
        'You have unsaved changes. What would you like to do?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'Save',
            onPress: () => handleSave(),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const pickImage = async (fromCamera: boolean) => {
    // Camera not supported on web — fall back to library picker
    const useCamera = fromCamera && Platform.OS !== 'web';
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [1, 1],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: Platform.OS !== 'web',
          aspect: [1, 1],
        });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === 'web') {
      pickImage(false);
      return;
    }
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Photo Library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Ingredient operations
  const addIngredient = () => {
    setIngredients((prev) => [...prev, EMPTY_INGREDIENT()]);
  };

  const updateIngredient = (key: string, field: keyof FormIngredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.key !== key) return ing;
        const updated = { ...ing, [field]: value };
        // Auto-guess aisle category when name changes
        if (field === 'name' && value.length > 2) {
          updated.aisle_category = guessAisleCategory(value);
        }
        return updated;
      })
    );
  };

  const removeIngredient = (key: string) => {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  };

  // Instruction operations
  const addInstruction = () => {
    setInstructions((prev) => [...prev, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const removeInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  // Category/tag toggle
  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const addNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setNewTag('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }

    setSaving(true);

    try {
      // Upload image if selected
      let image_url: string | undefined;
      if (imageUri) {
        image_url = await uploadImage.mutateAsync({ uri: imageUri });
      }

      const cleanIngredients: Ingredient[] = ingredients
        .filter((i) => i.name?.trim())
        .map((i) => ({
          name: i.name!.trim(),
          amount: i.amount ?? '',
          unit: i.unit ?? '',
          group: i.group,
          aisle_category: i.aisle_category ?? 'Other',
        }));

      const cleanInstructions = instructions.filter((s) => s.trim());

      const newRecipe = await createRecipe.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        total_time_minutes:
          prepTime && cookTime
            ? parseInt(prepTime) + parseInt(cookTime)
            : null,
        servings: parseInt(servings) || 4,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
        categories: selectedCategories,
        tags: selectedTags,
        image_url,
        is_favorite: false,
        season_tags: selectedSeasonTags,
        meal_type: selectedMealType,
      });

      if (selectedBookId && newRecipe?.id) {
        await addToBook.mutateAsync({ bookId: selectedBookId, recipeId: newRecipe.id });
      }

      isSavingRef.current = true;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: layout.screenPaddingH,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.textStyles.headingMedium,
      color: colors.textPrimary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 8,
    },
    saveButtonText: {
      ...typography.textStyles.labelMedium,
      color: '#fff',
    },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    section: {
      paddingHorizontal: layout.screenPaddingH,
      marginTop: 24,
    },
    sectionTitle: {
      ...typography.textStyles.headingSmall,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    sectionHint: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    label: {
      ...typography.textStyles.labelSmall,
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: layout.inputRadius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...typography.textStyles.bodyMedium,
      color: colors.textPrimary,
    },
    inputMultiline: {
      height: 80,
      textAlignVertical: 'top',
    },
    timeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    timeField: { flex: 1 },
    imagePicker: {
      height: 160,
      borderRadius: layout.cardRadius,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      overflow: 'hidden',
    },
    imagePickerLabel: {
      ...typography.textStyles.labelMedium,
      color: colors.textSecondary,
    },
    imagePickerSubtitle: {
      ...typography.textStyles.bodySmall,
      color: colors.placeholder,
    },
    ingredientRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    ingredientAmount: {
      width: 60,
    },
    ingredientUnit: {
      width: 70,
    },
    ingredientName: {
      flex: 1,
    },
    ingredientAisle: {
      marginTop: 4,
      marginLeft: 0,
    },
    removeButton: {
      width: 32,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addRowButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      marginTop: 4,
    },
    addRowText: {
      ...typography.textStyles.labelMedium,
      color: colors.primary,
    },
    instructionRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      flexShrink: 0,
    },
    stepNum: {
      color: '#fff',
      fontSize: 13,
      fontFamily: typography.fontFamilies.sansBold,
    },
    instructionInput: {
      flex: 1,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8,
      gap: 4,
    },
    categoryChipText: {
      fontSize: 13,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tagInputRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    tagInputField: { flex: 1 },
    tagAddBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagAddText: {
      color: '#fff',
      fontFamily: typography.fontFamilies.sansMedium,
      fontSize: 14,
    },
    aisleSelect: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 4,
    },
    aisleSelectText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: typography.fontFamilies.sansRegular,
    },
  }), [colors, typography, layout]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Recipe</Text>
          <TouchableOpacity
            style={[s.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Photo</Text>
            <TouchableOpacity style={s.imagePicker} onPress={showImagePicker}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Camera color={colors.placeholder} size={24} strokeWidth={1.5} />
                    <ImageIcon color={colors.placeholder} size={24} strokeWidth={1.5} />
                  </View>
                  <Text style={s.imagePickerLabel}>Add a photo</Text>
                  <Text style={s.imagePickerSubtitle}>Camera or library</Text>
                </>
              )}
            </TouchableOpacity>
            {imageUri ? (
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                style={{ marginTop: 8, alignItems: 'center' }}
              >
                <Text style={{ color: colors.destructive, fontSize: 14 }}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Basic info */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Basic Info</Text>
            <Text style={s.label}>TITLE *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Recipe title"
              placeholderTextColor={colors.placeholder}
            />
            <Text style={s.label}>DESCRIPTION</Text>
            <TextInput
              style={[s.input, s.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="A brief description (optional)"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={s.label}>PREP TIME (MIN)</Text>
                <TextInput
                  style={s.input}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  placeholder="15"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={s.timeField}>
                <Text style={s.label}>COOK TIME (MIN)</Text>
                <TextInput
                  style={s.input}
                  value={cookTime}
                  onChangeText={setCookTime}
                  placeholder="30"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
              <View style={s.timeField}>
                <Text style={s.label}>SERVINGS</Text>
                <TextInput
                  style={s.input}
                  value={servings}
                  onChangeText={setServings}
                  placeholder="4"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Meal Type */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Meal Type</Text>
            <Text style={[s.sectionHint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Tag this recipe for a specific meal. Leave blank to use it for any meal.
            </Text>
            <View style={s.chipContainer}>
              {MEAL_TYPES.map((type) => {
                const active = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedMealType(active ? null : type)}
                    style={[
                      s.categoryChip,
                      {
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{MEAL_TYPE_ICONS[type]}</Text>
                    <Text
                      style={[
                        s.categoryChipText,
                        {
                          color: active ? '#fff' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansMedium,
                        },
                      ]}
                    >
                      {MEAL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Categories */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Categories</Text>
            <View style={s.chipContainer}>
              {(categories ?? []).map((cat) => {
                const active = selectedCategories.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleCategory(cat.name)}
                    style={[
                      s.categoryChip,
                      {
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                    <Text
                      style={[
                        s.categoryChipText,
                        {
                          color: active ? '#fff' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansMedium,
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tags */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Tags</Text>
            <View style={s.chipContainer}>
              {selectedTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    s.categoryChip,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      s.categoryChipText,
                      { color: '#fff', fontFamily: typography.fontFamilies.sansMedium },
                    ]}
                  >
                    {tag}
                  </Text>
                  <X color="#fff" size={12} strokeWidth={2.5} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.tagInputRow}>
              <TextInput
                style={[s.input, s.tagInputField]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag..."
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={addNewTag}
              />
              <TouchableOpacity style={s.tagAddBtn} onPress={addNewTag}>
                <Text style={s.tagAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Season tags */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Season</Text>
            <Text style={[s.sectionHint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Tag this recipe so it appears in seasonal suggestions.
            </Text>
            <View style={s.chipContainer}>
              {(['spring', 'summer', 'fall', 'winter'] as const).map((season) => {
                const ICONS: Record<string, string> = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
                const LABELS: Record<string, string> = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
                const active = selectedSeasonTags.includes(season);
                return (
                  <TouchableOpacity
                    key={season}
                    onPress={() =>
                      setSelectedSeasonTags((prev) =>
                        active ? prev.filter((s) => s !== season) : [...prev, season]
                      )
                    }
                    style={[
                      s.categoryChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{ICONS[season]}</Text>
                    <Text
                      style={[
                        s.categoryChipText,
                        {
                          color: active ? '#fff' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansMedium,
                        },
                      ]}
                    >
                      {LABELS[season]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Recipe Book */}
          {recipeBooks && recipeBooks.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Recipe Book</Text>
              <Text style={[s.sectionHint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Add this recipe to one of your books.
              </Text>
              <View style={s.chipContainer}>
                {recipeBooks.map((book) => {
                  const active = selectedBookId === book.id;
                  return (
                    <TouchableOpacity
                      key={book.id}
                      onPress={() => setSelectedBookId(active ? null : book.id)}
                      style={[
                        s.categoryChip,
                        {
                          backgroundColor: active ? colors.primary : 'transparent',
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.categoryChipText,
                          {
                            color: active ? '#fff' : colors.textSecondary,
                            fontFamily: typography.fontFamilies.sansMedium,
                          },
                        ]}
                      >
                        {book.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Ingredients */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ingredients</Text>
            {ingredients.map((ing, idx) => (
              <View key={ing.key}>
                <View style={s.ingredientRow}>
                  <TextInput
                    style={[s.input, s.ingredientAmount]}
                    value={ing.amount ?? ''}
                    onChangeText={(v) => updateIngredient(ing.key, 'amount', v)}
                    placeholder="Amt"
                    placeholderTextColor={colors.placeholder}
                  />
                  <TextInput
                    style={[s.input, s.ingredientUnit]}
                    value={ing.unit ?? ''}
                    onChangeText={(v) => updateIngredient(ing.key, 'unit', v)}
                    placeholder="Unit"
                    placeholderTextColor={colors.placeholder}
                  />
                  <TextInput
                    style={[s.input, s.ingredientName]}
                    value={ing.name ?? ''}
                    onChangeText={(v) => updateIngredient(ing.key, 'name', v)}
                    placeholder="Ingredient name"
                    placeholderTextColor={colors.placeholder}
                  />
                  {ingredients.length > 1 ? (
                    <TouchableOpacity
                      style={s.removeButton}
                      onPress={() => removeIngredient(ing.key)}
                      hitSlop={8}
                    >
                      <Minus color={colors.destructive} size={18} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {/* Aisle category selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.ingredientAisle}
                >
                  {AISLE_CATEGORIES.map((aisle) => (
                    <TouchableOpacity
                      key={aisle}
                      onPress={() => updateIngredient(ing.key, 'aisle_category', aisle)}
                      style={[
                        s.categoryChip,
                        {
                          paddingVertical: 4,
                          marginRight: 6,
                          backgroundColor:
                            ing.aisle_category === aisle ? colors.primary + '20' : 'transparent',
                          borderColor:
                            ing.aisle_category === aisle ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.categoryChipText,
                          {
                            fontSize: 11,
                            color:
                              ing.aisle_category === aisle
                                ? colors.primary
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {aisle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
            <TouchableOpacity style={s.addRowButton} onPress={addIngredient}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={s.addRowText}>Add ingredient</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Instructions</Text>
            {instructions.map((step, idx) => (
              <View key={idx} style={s.instructionRow}>
                <View style={s.stepBadge}>
                  <Text style={s.stepNum}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[s.input, s.instructionInput]}
                  value={step}
                  onChangeText={(v) => updateInstruction(idx, v)}
                  placeholder={`Step ${idx + 1}...`}
                  placeholderTextColor={colors.placeholder}
                  multiline
                />
                {instructions.length > 1 ? (
                  <TouchableOpacity
                    style={s.removeButton}
                    onPress={() => removeInstruction(idx)}
                    hitSlop={8}
                  >
                    <Minus color={colors.destructive} size={18} strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity style={s.addRowButton} onPress={addInstruction}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={s.addRowText}>Add step</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
