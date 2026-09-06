import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../../lib/hooks/useRecipes';
import { Category } from '../../../lib/database.types';

const EMOJI_OPTIONS = ['🥘','🍳','🥗','🍝','🥩','🐟','🍰','🫔','🌮','🍜','🥪','🍲','🥦','🍕','🫕'];

export default function ManageCategoriesScreen() {
  const { colors, typography, layout } = useTheme();
  const { data: categories = [], isLoading } = useCategories();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🥘');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { name: newName.trim(), icon: newIcon },
      {
        onSuccess: () => {
          setNewName('');
          setNewIcon('🥘');
          setShowAdd(false);
        },
      }
    );
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon ?? '🥘');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCategory.mutate(
      { id: editingId, name: editName.trim(), icon: editIcon },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      `Delete "${cat.name}"?`,
      'This will remove the category from all recipes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory.mutate(cat.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
          Categories
        </Text>
        <TouchableOpacity
          onPress={() => setShowAdd((v) => !v)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Plus size={16} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Add new form */}
        {showAdd && (
          <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
              NEW CATEGORY
            </Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewIcon(e)}
                  style={[
                    styles.emojiChip,
                    { backgroundColor: newIcon === e ? colors.primary + '20' : colors.background, borderColor: newIcon === e ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputRow}>
              <Text style={{ fontSize: 22 }}>{newIcon}</Text>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
                placeholder="Category name"
                placeholderTextColor={colors.placeholder}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: newName.trim() ? colors.primary : colors.border }]}
                onPress={handleAdd}
                disabled={!newName.trim() || createCategory.isPending}
              >
                {createCategory.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Check size={16} color="#fff" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Category list */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {categories.length === 0 && (
              <Text style={[styles.empty, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                No categories yet. Tap + to add one.
              </Text>
            )}
            {categories.map((cat, i) => {
              const isEditing = editingId === cat.id;
              const isSystem = cat.household_id === null;
              return (
                <View key={cat.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  {isEditing ? (
                    <View style={styles.editBlock}>
                      {/* Emoji picker row */}
                      <View style={styles.emojiRowInline}>
                        {EMOJI_OPTIONS.map((e) => (
                          <TouchableOpacity key={e} onPress={() => setEditIcon(e)}>
                            <Text style={[styles.emojiSmall, { opacity: editIcon === e ? 1 : 0.35 }]}>{e}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {/* Name input + action buttons */}
                      <View style={styles.editInputRow}>
                        <Text style={{ fontSize: 20 }}>{editIcon}</Text>
                        <TextInput
                          style={[styles.editInput, { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, fontFamily: typography.fontFamilies.sansRegular }]}
                          value={editName}
                          onChangeText={setEditName}
                          returnKeyType="done"
                          onSubmitEditing={handleSaveEdit}
                          autoFocus
                        />
                        <TouchableOpacity onPress={handleSaveEdit} hitSlop={8} style={[styles.editActionBtn, { backgroundColor: colors.primary }]}>
                          <Check size={16} color="#fff" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8} style={[styles.editActionBtn, { backgroundColor: colors.border }]}>
                          <X size={16} color={colors.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 20, width: 28 }}>{cat.icon ?? '🥘'}</Text>
                      <Text style={[styles.catName, { flex: 1, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}>
                        {cat.name}
                      </Text>
                      {isSystem ? (
                        <View style={[styles.systemBadge, { backgroundColor: colors.border }]}>
                          <Text style={[styles.systemBadgeText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                            DEFAULT
                          </Text>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity onPress={() => startEdit(cat)} hitSlop={8} style={{ padding: 4 }}>
                            <Pencil size={16} color={colors.textSecondary} strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(cat)} hitSlop={8} style={{ padding: 4 }}>
                            <Trash2 size={16} color={colors.destructive} strokeWidth={2} />
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
          Default categories are shared across the app and can't be edited. Tap + to create your own custom categories.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 20, gap: 16 },
  addForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  formLabel: { fontSize: 11, letterSpacing: 1.5 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiRowInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiChip: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSmall: { fontSize: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexWrap: 'nowrap',
  },
  catName: { fontSize: 15 },
  editBlock: {
    flex: 1,
    flexDirection: 'column',
    gap: 10,
    paddingVertical: 4,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
  editActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', padding: 24, fontSize: 14 },
  hint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  systemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontSize: 10,
    letterSpacing: 1,
  },
});
