import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Minus, Camera, Image as ImageIcon, Download } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useCreateRecipe, useUpdateRecipe, useUploadRecipeImage, RecipeWithMeta } from '../../lib/hooks/useRecipes';
import { importFromUrl } from '../../lib/api/importRecipe';
import { Ingredient, SkillLevel } from '../../lib/database.types';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../lib/theme';
import { FoodBankItemPicker } from './FoodBankItemPicker';

interface FormIngredient extends Ingredient {
  key: string;
}

const EMPTY_INGREDIENT = (): FormIngredient => ({
  key: String(Date.now() + Math.random()),
  name: '',
  amount: '',
  unit: '',
});

interface RecipeFormProps {
  mode: 'create' | 'edit';
  initialRecipe?: RecipeWithMeta;
  onSaved: (recipeId: string) => void;
}

export function RecipeForm({ mode, initialRecipe, onSaved }: RecipeFormProps) {
  const { colors, typography, layout } = useTheme();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const uploadImage = useUploadRecipeImage();

  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [description, setDescription] = useState(initialRecipe?.description ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.source_url ?? '');
  const [imageUri, setImageUri] = useState<string | null>(initialRecipe?.image_url ?? null);
  const [prepTime, setPrepTime] = useState(initialRecipe?.prep_time_minutes?.toString() ?? '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cook_time_minutes?.toString() ?? '');
  const [servings, setServings] = useState(initialRecipe?.servings?.toString() ?? '4');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(initialRecipe?.skill_level ?? null);
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initialRecipe?.ingredients?.length
      ? initialRecipe.ingredients.map((i) => ({ ...i, key: String(Date.now() + Math.random()) }))
      : [EMPTY_INGREDIENT()]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initialRecipe?.instructions?.length ? initialRecipe.instructions : ['']
  );
  const [foodBankItemIds, setFoodBankItemIds] = useState<string[]>(initialRecipe?.foodBankItemIds ?? []);
  const [saving, setSaving] = useState(false);

  const toggleFoodBankItem = (id: string) => {
    setFoodBankItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const imported = await importFromUrl(importUrl.trim());
      setTitle(imported.title);
      setDescription(imported.description ?? '');
      setSourceUrl(importUrl.trim());
      setServings(String(imported.servings ?? 4));
      setPrepTime(imported.prep_time_minutes != null ? String(imported.prep_time_minutes) : '');
      setCookTime(imported.cook_time_minutes != null ? String(imported.cook_time_minutes) : '');
      setIngredients(
        imported.ingredients.length
          ? imported.ingredients.map((i) => ({ ...i, key: String(Date.now() + Math.random()) }))
          : [EMPTY_INGREDIENT()]
      );
      setInstructions(imported.instructions.length ? imported.instructions : ['']);
      if (imported.image_url) setImageUri(imported.image_url);
    } catch (e: any) {
      Alert.alert('Import failed', e.message);
    } finally {
      setImporting(false);
    }
  };

  const pickImage = async () => {
    const useCamera = Platform.OS !== 'web';
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const addIngredient = () => setIngredients((prev) => [...prev, EMPTY_INGREDIENT()]);
  const updateIngredient = (key: string, field: keyof Ingredient, value: string) =>
    setIngredients((prev) => prev.map((ing) => (ing.key === key ? { ...ing, [field]: value } : ing)));
  const removeIngredient = (key: string) => setIngredients((prev) => prev.filter((i) => i.key !== key));

  const addInstruction = () => setInstructions((prev) => [...prev, '']);
  const updateInstruction = (index: number, value: string) =>
    setInstructions((prev) => prev.map((s, i) => (i === index ? value : s)));
  const removeInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }
    setSaving(true);
    try {
      let image_url: string | null | undefined = imageUri ?? undefined;
      const isLocalUri = imageUri && !imageUri.startsWith('http');
      if (isLocalUri) {
        image_url = await uploadImage.mutateAsync({ uri: imageUri!, recipeId: initialRecipe?.id });
      }

      const cleanIngredients: Ingredient[] = ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), amount: i.amount, unit: i.unit, group: i.group }));
      const cleanInstructions = instructions.filter((s) => s.trim());

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        source_url: sourceUrl.trim() || null,
        image_url: image_url ?? null,
        prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
        servings: parseInt(servings, 10) || 4,
        skill_level: skillLevel,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      };

      if (mode === 'create') {
        const created = await createRecipe.mutateAsync({ recipe: payload, foodBankItemIds });
        onSaved(created.id);
      } else {
        await updateRecipe.mutateAsync({ id: initialRecipe!.id, recipe: payload, foodBankItemIds });
        onSaved(initialRecipe!.id);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { paddingHorizontal: layout.screenPaddingH, marginTop: 24 },
        sectionTitle: { ...typography.textStyles.headingSmall, color: colors.textPrimary, marginBottom: 8 },
        label: { ...typography.textStyles.labelSmall, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
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
        inputMultiline: { height: 80, textAlignVertical: 'top' },
        row: { flexDirection: 'row', gap: 12 },
        flex1: { flex: 1 },
        importRow: { flexDirection: 'row', gap: 8 },
        importBtn: {
          backgroundColor: colors.secondary,
          borderRadius: layout.inputRadius,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
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
        chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
        chipText: { fontSize: 13 },
        ingredientRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
        ingredientAmount: { width: 60 },
        ingredientUnit: { width: 70 },
        ingredientName: { flex: 1 },
        removeButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
        addRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
        addRowText: { ...typography.textStyles.labelMedium, color: colors.primary },
        instructionRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
        stepBadge: {
          width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0,
        },
        stepNum: { color: '#fff', fontSize: 13, fontFamily: typography.fontFamilies.sansBold },
        instructionInput: { flex: 1, minHeight: 60, textAlignVertical: 'top' },
        saveBar: {
          padding: layout.screenPaddingH,
          paddingBottom: 32,
        },
        saveButton: {
          backgroundColor: colors.primary,
          borderRadius: layout.buttonRadius,
          paddingVertical: 16,
          alignItems: 'center',
        },
        saveButtonText: { ...typography.textStyles.headingSmall, color: colors.textOnAccent },
      }),
    [colors, typography, layout]
  );

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {mode === 'create' && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import from a URL (optional)</Text>
          <View style={s.importRow}>
            <TextInput
              style={[s.input, s.flex1]}
              value={importUrl}
              onChangeText={setImportUrl}
              placeholder="Paste a recipe URL..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={s.importBtn} onPress={handleImportUrl} disabled={importing}>
              {importing ? <ActivityIndicator color="#fff" size="small" /> : <Download color="#fff" size={18} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Photo</Text>
        <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Camera color={colors.placeholder} size={24} strokeWidth={1.5} />
                <ImageIcon color={colors.placeholder} size={24} strokeWidth={1.5} />
              </View>
              <Text style={{ color: colors.textSecondary }}>Add a photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Basic Info</Text>
        <Text style={s.label}>TITLE *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Recipe title" placeholderTextColor={colors.placeholder} />
        <Text style={s.label}>DESCRIPTION</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="A brief description (optional)"
          placeholderTextColor={colors.placeholder}
          multiline
        />
        <View style={s.row}>
          <View style={s.flex1}>
            <Text style={s.label}>PREP TIME (MIN)</Text>
            <TextInput style={s.input} value={prepTime} onChangeText={setPrepTime} placeholder="15" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
          <View style={s.flex1}>
            <Text style={s.label}>COOK TIME (MIN)</Text>
            <TextInput style={s.input} value={cookTime} onChangeText={setCookTime} placeholder="30" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
          <View style={s.flex1}>
            <Text style={s.label}>SERVINGS</Text>
            <TextInput style={s.input} value={servings} onChangeText={setServings} placeholder="4" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Skill Level</Text>
        <View style={s.chipContainer}>
          {SKILL_LEVELS.map((level) => {
            const active = skillLevel === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setSkillLevel(active ? null : level)}
                style={[s.chip, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}
              >
                <Text style={[s.chipText, { color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  {SKILL_LEVEL_LABELS[level]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Tag Food Bank Items</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
          Which food bank items does this recipe use? This is what "Can make now" filtering matches against.
        </Text>
        <FoodBankItemPicker selectedIds={foodBankItemIds} onToggle={toggleFoodBankItem} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Ingredients</Text>
        {ingredients.map((ing) => (
          <View key={ing.key} style={s.ingredientRow}>
            <TextInput style={[s.input, s.ingredientAmount]} value={ing.amount} onChangeText={(v) => updateIngredient(ing.key, 'amount', v)} placeholder="Amt" placeholderTextColor={colors.placeholder} />
            <TextInput style={[s.input, s.ingredientUnit]} value={ing.unit} onChangeText={(v) => updateIngredient(ing.key, 'unit', v)} placeholder="Unit" placeholderTextColor={colors.placeholder} />
            <TextInput style={[s.input, s.ingredientName]} value={ing.name} onChangeText={(v) => updateIngredient(ing.key, 'name', v)} placeholder="Ingredient name" placeholderTextColor={colors.placeholder} />
            {ingredients.length > 1 && (
              <TouchableOpacity style={s.removeButton} onPress={() => removeIngredient(ing.key)} hitSlop={8}>
                <Minus color={colors.destructive} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addRowButton} onPress={addIngredient}>
          <Plus color={colors.primary} size={16} strokeWidth={2.5} />
          <Text style={s.addRowText}>Add ingredient</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Instructions</Text>
        {instructions.map((step, idx) => (
          <View key={idx} style={s.instructionRow}>
            <View style={s.stepBadge}><Text style={s.stepNum}>{idx + 1}</Text></View>
            <TextInput
              style={[s.input, s.instructionInput]}
              value={step}
              onChangeText={(v) => updateInstruction(idx, v)}
              placeholder={`Step ${idx + 1}...`}
              placeholderTextColor={colors.placeholder}
              multiline
            />
            {instructions.length > 1 && (
              <TouchableOpacity style={s.removeButton} onPress={() => removeInstruction(idx)} hitSlop={8}>
                <Minus color={colors.destructive} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addRowButton} onPress={addInstruction}>
          <Plus color={colors.primary} size={16} strokeWidth={2.5} />
          <Text style={s.addRowText}>Add step</Text>
        </TouchableOpacity>
      </View>

      <View style={s.saveBar}>
        <TouchableOpacity style={[s.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>{mode === 'create' ? 'Save Recipe' : 'Save Changes'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
