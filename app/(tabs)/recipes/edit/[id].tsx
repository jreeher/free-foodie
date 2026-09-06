import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Minus, Camera, Image as ImageIcon, ArrowLeft, X, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../../../lib/hooks/useTheme';
import {
  useRecipe,
  useUpdateRecipe,
  useCategories,
  useUploadRecipeImage,
} from '../../../../lib/hooks/useRecipes';
import { Ingredient } from '../../../../lib/database.types';
import { AISLE_CATEGORIES, MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MealType } from '../../../../lib/theme';
import { guessAisleCategory } from '../../../../lib/utils/ingredients';

interface FormIngredient extends Partial<Ingredient> {
  key: string;
}

const mkKey = () => String(Date.now() + Math.random());

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const { data: recipe, isLoading: recipeLoading } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();
  const uploadImage = useUploadRecipeImage();
  const { data: categories } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredients, setIngredients] = useState<FormIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSeasonTags, setSelectedSeasonTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recipe) return;
    setTitle(recipe.title);
    setDescription(recipe.description ?? '');
    setPrepTime(recipe.prep_time_minutes?.toString() ?? '');
    setCookTime(recipe.cook_time_minutes?.toString() ?? '');
    setServings(recipe.servings.toString());
    setIngredients(
      recipe.ingredients.map((ing) => ({ ...ing, key: mkKey() }))
    );
    setInstructions(recipe.instructions.length ? recipe.instructions : ['']);
    setSelectedCategories(recipe.categories);
    setSelectedTags(recipe.tags);
    setSelectedSeasonTags(recipe.season_tags ?? []);
    setExistingImageUrl(recipe.image_url);
    setSelectedMealType((recipe.meal_type as MealType) ?? null);
    setNotes(recipe.notes ?? '');
  }, [recipe]);

  if (recipeLoading || !recipe) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const pickImage = async (fromCamera: boolean) => {
    const useCamera = fromCamera && Platform.OS !== 'web';
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: Platform.OS !== 'web', aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const moveIngredient = (key: string, dir: -1 | 1) =>
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });

  const moveInstruction = (idx: number, dir: -1 | 1) =>
    setInstructions((prev) => {
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });

  const addIngredient = () =>
    setIngredients((p) => [...p, { key: mkKey(), name: '', amount: '', unit: '', aisle_category: 'Other' }]);

  const updateIngredient = (key: string, field: keyof FormIngredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.key !== key) return ing;
        const updated = { ...ing, [field]: value };
        if (field === 'name' && value.length > 2) updated.aisle_category = guessAisleCategory(value);
        return updated;
      })
    );
  };

  const removeIngredient = (key: string) => setIngredients((p) => p.filter((i) => i.key !== key));

  const addInstruction = () => setInstructions((p) => [...p, '']);
  const updateInstruction = (i: number, v: string) => setInstructions((p) => p.map((s, idx) => idx === i ? v : s));
  const removeInstruction = (i: number) => { if (instructions.length > 1) setInstructions((p) => p.filter((_, idx) => idx !== i)); };

  const toggleCategory = (name: string) =>
    setSelectedCategories((p) => p.includes(name) ? p.filter((c) => c !== name) : [...p, name]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Please enter a recipe title.'); return; }
    setSaving(true);
    try {
      let image_url: string | undefined | null = existingImageUrl;
      if (imageUri) image_url = await uploadImage.mutateAsync({ uri: imageUri, recipeId: id });

      const cleanIngredients: Ingredient[] = ingredients
        .filter((i) => i.name?.trim())
        .map((i) => ({
          name: i.name!.trim(),
          amount: i.amount ?? '',
          unit: i.unit ?? '',
          group: i.group,
          aisle_category: i.aisle_category ?? 'Other',
        }));

      await updateRecipe.mutateAsync({
        id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          prep_time_minutes: prepTime ? parseInt(prepTime) : null,
          cook_time_minutes: cookTime ? parseInt(cookTime) : null,
          total_time_minutes: prepTime && cookTime ? parseInt(prepTime) + parseInt(cookTime) : null,
          servings: parseInt(servings) || 4,
          ingredients: cleanIngredients,
          instructions: instructions.filter((s) => s.trim()),
          categories: selectedCategories,
          tags: selectedTags,
          season_tags: selectedSeasonTags,
          image_url,
          meal_type: selectedMealType,
          notes: notes.trim() || null,
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const displayImage = imageUri || existingImageUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            Edit Recipe
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={[styles.saveButtonText, { fontFamily: typography.fontFamilies.sansMedium }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Photo */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Photo</Text>
            <TouchableOpacity
              style={[styles.imagePicker, { borderColor: colors.border }]}
              onPress={() => {
                if (Platform.OS === 'web') { pickImage(false); return; }
                Alert.alert('Photo', '', [
                  { text: 'Camera', onPress: () => pickImage(true) },
                  { text: 'Library', onPress: () => pickImage(false) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            >
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <>
                  <Camera color={colors.placeholder} size={28} strokeWidth={1.5} />
                  <Text style={[styles.imageLabel, { color: colors.textSecondary }]}>Change photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic info — same pattern as add.tsx */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
              Basic Info
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Recipe title"
              placeholderTextColor={colors.placeholder}
            />
            <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.multiline, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.timeRow}>
              {[
                { label: 'PREP (MIN)', value: prepTime, setter: setPrepTime },
                { label: 'COOK (MIN)', value: cookTime, setter: setCookTime },
                { label: 'SERVINGS', value: servings, setter: setServings },
              ].map(({ label, value, setter }) => (
                <View key={label} style={styles.timeField}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                    value={value}
                    onChangeText={setter}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Meal Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Meal Type</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular, marginBottom: 12, lineHeight: 18 }}>
              Tag this recipe for a specific meal. Leave blank to use it for any meal.
            </Text>
            <View style={styles.chipWrap}>
              {MEAL_TYPES.map((type) => {
                const active = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedMealType(active ? null : type)}
                    style={[styles.chip, {
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={{ fontSize: 14 }}>{MEAL_TYPE_ICONS[type]}</Text>
                    <Text style={{ fontSize: 13, color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                      {MEAL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Categories</Text>
            <View style={styles.chipWrap}>
              {(categories ?? []).map((cat) => {
                const active = selectedCategories.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleCategory(cat.name)}
                    style={[styles.chip, {
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                    <Text style={{ fontSize: 13, color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Tags</Text>
            <View style={styles.chipWrap}>
              {selectedTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setSelectedTags((p) => p.filter((t) => t !== tag))}
                  style={[styles.chip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ fontSize: 13, color: '#fff', fontFamily: typography.fontFamilies.sansMedium }}>{tag}</Text>
                  <X color="#fff" size={12} strokeWidth={2.5} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add tag..."
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                onSubmitEditing={() => {
                  const t = newTag.trim().toLowerCase();
                  if (t && !selectedTags.includes(t)) setSelectedTags((p) => [...p, t]);
                  setNewTag('');
                }}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const t = newTag.trim().toLowerCase();
                  if (t && !selectedTags.includes(t)) setSelectedTags((p) => [...p, t]);
                  setNewTag('');
                }}
              >
                <Text style={[styles.saveButtonText, { fontFamily: typography.fontFamilies.sansMedium }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Season tags */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Season</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular, marginBottom: 12, lineHeight: 18 }}>
              Tag this recipe so it appears in seasonal suggestions.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{ICONS[season]}</Text>
                    <Text style={{ fontSize: 13, color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                      {LABELS[season]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Ingredients</Text>
            {ingredients.map((ing, ingIdx) => (
              <View key={ing.key} style={styles.ingRow}>
                <View style={{ justifyContent: 'center', gap: 2 }}>
                  <TouchableOpacity hitSlop={6} onPress={() => moveIngredient(ing.key, -1)} disabled={ingIdx === 0}>
                    <ChevronUp color={ingIdx === 0 ? colors.border : colors.textSecondary} size={16} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity hitSlop={6} onPress={() => moveIngredient(ing.key, 1)} disabled={ingIdx === ingredients.length - 1}>
                    <ChevronDown color={ingIdx === ingredients.length - 1 ? colors.border : colors.textSecondary} size={16} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.ingAmount, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  value={ing.amount ?? ''}
                  onChangeText={(v) => updateIngredient(ing.key, 'amount', v)}
                  placeholder="Amt"
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, styles.ingUnit, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  value={ing.unit ?? ''}
                  onChangeText={(v) => updateIngredient(ing.key, 'unit', v)}
                  placeholder="Unit"
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  value={ing.name ?? ''}
                  onChangeText={(v) => updateIngredient(ing.key, 'name', v)}
                  placeholder="Ingredient"
                  placeholderTextColor={colors.placeholder}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(ing.key)} hitSlop={8} style={{ width: 32, alignItems: 'center', justifyContent: 'center', height: 44 }}>
                    <Minus color={colors.destructive} size={18} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={addIngredient} style={styles.addRow}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={{ color: colors.primary, fontSize: 14, fontFamily: typography.fontFamilies.sansMedium }}>Add ingredient</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Instructions</Text>
            {instructions.map((step, idx) => (
              <View key={idx} style={styles.ingRow}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <TouchableOpacity hitSlop={6} onPress={() => moveInstruction(idx, -1)} disabled={idx === 0}>
                    <ChevronUp color={idx === 0 ? colors.border : colors.textSecondary} size={16} strokeWidth={2} />
                  </TouchableOpacity>
                  <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: '#fff', fontSize: 13, fontFamily: typography.fontFamilies.sansBold }}>{idx + 1}</Text>
                  </View>
                  <TouchableOpacity hitSlop={6} onPress={() => moveInstruction(idx, 1)} disabled={idx === instructions.length - 1}>
                    <ChevronDown color={idx === instructions.length - 1 ? colors.border : colors.textSecondary} size={16} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, minHeight: 60, textAlignVertical: 'top', color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  value={step}
                  onChangeText={(v) => updateInstruction(idx, v)}
                  placeholder={`Step ${idx + 1}`}
                  placeholderTextColor={colors.placeholder}
                  multiline
                />
                {instructions.length > 1 && (
                  <TouchableOpacity onPress={() => removeInstruction(idx)} hitSlop={8} style={{ width: 32, alignItems: 'center', justifyContent: 'center', height: 44 }}>
                    <Minus color={colors.destructive} size={18} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={addInstruction} style={styles.addRow}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={{ color: colors.primary, fontSize: 14, fontFamily: typography.fontFamilies.sansMedium }}>Add step</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline, { height: 100, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tips, substitutions, personal tweaks..."
              placeholderTextColor={colors.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18 },
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 14 },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  label: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  multiline: { height: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  imagePicker: { height: 140, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  imageLabel: { fontSize: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, gap: 4 },
  ingRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 8 },
  ingAmount: { width: 60 },
  ingUnit: { width: 70 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
});
