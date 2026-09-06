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
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useTags,
  useCreateTag,
  useDeleteTag,
} from '../../../lib/hooks/useRecipes';

export default function ManageTagsScreen() {
  const { colors, typography, layout } = useTheme();
  const { data: tags = [], isLoading } = useTags();

  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      setNewTag('');
      return;
    }
    createTag.mutate(name, { onSuccess: () => setNewTag('') });
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      `Delete "#${name}"?`,
      'This will remove the tag from all recipes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTag.mutate(id) },
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
          Tags
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Add new tag */}
        <View style={[styles.addSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            ADD TAG
          </Text>
          <View style={styles.inputRow}>
            <Text style={[styles.hashPrefix, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>#</Text>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, fontFamily: typography.fontFamilies.sansRegular }]}
              placeholder="e.g. quick, weeknight, vegetarian"
              placeholderTextColor={colors.placeholder}
              value={newTag}
              onChangeText={setNewTag}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: newTag.trim() ? colors.primary : colors.border }]}
              onPress={handleAdd}
              disabled={!newTag.trim() || createTag.isPending}
            >
              {createTag.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={16} color="#fff" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tag list */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.tagCloud}>
            {tags.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                No tags yet. Add some above.
              </Text>
            ) : (
              tags.map((tag) => (
                <View
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    #{tag.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(tag.id, tag.name)} hitSlop={6}>
                    <X size={13} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

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
  scroll: { padding: 20, gap: 20 },
  addSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  label: { fontSize: 11, letterSpacing: 1.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hashPrefix: { fontSize: 18, paddingBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 14 },
  empty: { textAlign: 'center', width: '100%', padding: 24, fontSize: 14 },
});
