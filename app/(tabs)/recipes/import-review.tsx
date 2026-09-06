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
import { ArrowLeft, Check, Plus, Minus, Sparkles, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useCreateRecipe, useUploadRecipeImage } from '../../../lib/hooks/useRecipes';
import { Ingredient } from '../../../lib/database.types';
import { guessAisleCategory } from '../../../lib/utils/ingredients';
import { ImportedRecipe } from '../../../lib/api/importRecipe';
import { MEAL_TYPES, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MealType } from '../../../lib/theme';

interface FormIngredient extends Ingredient {
  key: string;
}

const mkKey = () => String(Date.now() + Math.random());

export default function ImportReviewScreen() {
  const { data: rawData, imageUri } = useLocalSearchParams<{ data: string; imageUri?: string }>();
  const { colors, typography, layout } = useTheme();
  const createRecipe = useCreateRecipe();
  const uploadImage = useUploadRecipeImage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<FormIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [saving, setSaving] = useState(false);
  const [resolvedImageUri, setResolvedImageUri] = useState<string | undefined>(imageUri);

  useEffect(() => {
    if (!rawData) return;
    try {
      const parsed: ImportedRecipe = JSON.parse(rawData);
      setTitle(parsed.title ?? '');
      setDescription(parsed.description ?? '');
      setServings(String(parsed.servings ?? 4));
      setPrepTime(parsed.prep_time_minutes ? String(parsed.prep_time_minutes) : '');
      setCookTime(parsed.cook_time_minutes ? String(parsed.cook_time_minutes) : '');
      setIngredients(
        (parsed.ingredients ?? []).map((ing: any) => ({
          key: mkKey(),
          name: ing.name ?? '',
          amount: ing.amount ?? '',
          unit: ing.unit ?? '',
          aisle_category: guessAisleCategory(ing.name ?? ''),
        }))
      );
      setInstructions(parsed.instructions ?? []);
      setSourceUrl(parsed.source_url ?? '');
      // Use image_url from URL imports when no local photo was selected
      if (!imageUri && parsed.image_url) {
        setResolvedImageUri(parsed.image_url);
      }
    } catch {
      Alert.alert('Error', 'Failed to parse imported recipe.');
      router.back();
    }
  }, [rawData]);

  const updateIngredient = (key: string, field: keyof FormIngredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing) => ing.key !== key ? ing : { ...ing, [field]: value })
    );
  };

  const removeIngredient = (key: string) =>
    setIngredients((prev) => prev.filter((i) => i.key !== key));

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { key: mkKey(), name: '', amount: '', unit: '', aisle_category: 'Other' }]);

  const updateInstruction = (i: number, v: string) =>
    setInstructions((prev) => prev.map((s, idx) => idx === i ? v : s));

  const removeInstruction = (i: number) => {
    if (instructions.length > 1) setInstructions((p) => p.filter((_, idx) => idx !== i));
  };

  const addInstruction = () => setInstructions((p) => [...p, '']);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }
    setSaving(true);
    try {
      let image_url: string | undefined;
      if (resolvedImageUri) {
        try {
          image_url = await uploadImage.mutateAsync({ uri: resolvedImageUri });
        } catch {
          // Bad or inaccessible image URL — save the recipe without a photo rather
          // than blocking the whole save. The user can add a photo later from the edit screen.
        }
      }

      const cleanIngredients: Ingredient[] = ingredients
        .filter((i) => i.name.trim())
        .map(({ key, ...rest }) => rest);

      await createRecipe.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        total_time_minutes:
          prepTime && cookTime ? parseInt(prepTime) + parseInt(cookTime) : null,
        servings: parseInt(servings) || 4,
        ingredients: cleanIngredients,
        instructions: instructions.filter((s) => s.trim()),
        categories: [],
        tags: [],
        source_url: sourceUrl || null,
        image_url,
        is_favorite: false,
        season_tags: [],
        meal_type: selectedMealType,
      });

      router.replace('/(tabs)/recipes');
    } catch (e: any) {
      Alert.alert('Error saving recipe', e.message);
    } finally {
      setSaving(false);
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
          <View style={styles.headerCenter}>
            <View style={[styles.aiTag, { backgroundColor: colors.primary + '15' }]}>
              <Sparkles color={colors.primary} size={12} strokeWidth={2} />
              <Text style={[styles.aiTagText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
                AI Extracted
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
              Review Recipe
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Check color="#fff" size={20} strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Notice */}
          <View style={[styles.notice, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '30' }]}>
            <Text style={[styles.noticeText, { color: colors.secondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              Review and edit before saving. Blog narrative has been removed — these are just the essentials.
            </Text>
          </View>

          {/* Photo preview if from image import or URL with image */}
          {resolvedImageUri ? (
            <Image source={{ uri: resolvedImageUri }} style={styles.importedPhoto} contentFit="cover" />
          ) : null}

          {/* Source URL */}
          {sourceUrl ? (
            <View style={[styles.sourceRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <ExternalLink color={colors.textSecondary} size={14} strokeWidth={2} />
              <Text
                style={[styles.sourceText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}
                numberOfLines={1}
              >
                {sourceUrl}
              </Text>
            </View>
          ) : null}

          {/* Meal Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>MEAL TYPE</Text>
            <View style={styles.chipRow}>
              {MEAL_TYPES.map((type) => {
                const active = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedMealType(active ? null : type)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>{MEAL_TYPE_ICONS[type]}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: active ? '#fff' : colors.textSecondary,
                        fontFamily: typography.fontFamilies.sansMedium,
                      }}
                    >
                      {MEAL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.serifDisplay, fontSize: 22 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Recipe title"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.multiline, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
              value={description}
              onChangeText={setDescription}
              placeholder="One-sentence description"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>

          {/* Times + Servings */}
          <View style={styles.timeRow}>
            {[
              { label: 'PREP (MIN)', value: prepTime, setter: setPrepTime },
              { label: 'COOK (MIN)', value: cookTime, setter: setCookTime },
              { label: 'SERVINGS', value: servings, setter: setServings },
            ].map(({ label, value, setter }) => (
              <View key={label} style={styles.timeField}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.mono, textAlign: 'center' }]}
                  value={value}
                  onChangeText={setter}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            ))}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Ingredients
            </Text>
            {ingredients.map((ing) => (
              <View key={ing.key} style={styles.ingRow}>
                <TextInput
                  style={[styles.input, styles.ingAmount, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.mono }]}
                  value={ing.amount}
                  onChangeText={(v) => updateIngredient(ing.key, 'amount', v)}
                  placeholder="Amt"
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, styles.ingUnit, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
                  value={ing.unit}
                  onChangeText={(v) => updateIngredient(ing.key, 'unit', v)}
                  placeholder="Unit"
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(ing.key, 'name', v)}
                  placeholder="Ingredient"
                  placeholderTextColor={colors.placeholder}
                />
                <TouchableOpacity onPress={() => removeIngredient(ing.key)} hitSlop={8} style={styles.removeBtn}>
                  <Minus color={colors.destructive} size={16} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={addIngredient} style={styles.addRow}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={[styles.addRowText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Add ingredient
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
              Instructions
            </Text>
            {instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.stepNum, { fontFamily: typography.fontFamilies.sansBold }]}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, minHeight: 70, textAlignVertical: 'top', color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular, fontSize: 15 }]}
                  value={step}
                  onChangeText={(v) => updateInstruction(idx, v)}
                  multiline
                  placeholder={`Step ${idx + 1}`}
                  placeholderTextColor={colors.placeholder}
                />
                {instructions.length > 1 && (
                  <TouchableOpacity onPress={() => removeInstruction(idx)} hitSlop={8} style={styles.removeBtn}>
                    <Minus color={colors.destructive} size={16} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={addInstruction} style={styles.addRow}>
              <Plus color={colors.primary} size={16} strokeWidth={2.5} />
              <Text style={[styles.addRowText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Add step
              </Text>
            </TouchableOpacity>
          </View>

          {/* Save button at bottom */}
          <TouchableOpacity
            style={[styles.saveBottomButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check color="#fff" size={20} strokeWidth={2.5} />
                <Text style={[styles.saveBottomText, { fontFamily: typography.fontFamilies.sansSemiBold }]}>
                  Save Recipe
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 16 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  aiTagText: { fontSize: 11 },
  saveButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  notice: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 20 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  importedPhoto: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 20 },
  sourceText: { fontSize: 13, flex: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  multiline: { height: 70, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  timeField: { flex: 1 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, marginBottom: 14 },
  ingRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
  ingAmount: { width: 56 },
  ingUnit: { width: 66 },
  removeBtn: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowText: { fontSize: 14 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0 },
  stepNum: { color: '#fff', fontSize: 13 },
  saveBottomButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 16, marginTop: 8 },
  saveBottomText: { color: '#fff', fontSize: 16 },
});
