import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, ChevronRight, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useProfile } from '../../../lib/hooks/useAuth';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useRecipes, RecipeWithMeta } from '../../../lib/hooks/useRecipes';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ProfileScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();
  const { updateProfile, signOut } = useAuthStore();
  const { data: myRecipes, isLoading } = useRecipes({ mine: true });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: nameInput.trim() || null });
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const renderRecipe = ({ item }: { item: RecipeWithMeta }) => (
    <TouchableOpacity
      style={[styles.recipeRow, { borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: item.id } })}
    >
      <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{item.title}</Text>
      <ChevronRight size={16} color={colors.border} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Profile
        </Text>
      </View>

      <View style={[styles.section, { paddingHorizontal: layout.screenPaddingH }]}>
        {editingName ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Display name"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveName} disabled={saving} style={[styles.saveNameBtn, { backgroundColor: colors.primary }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff' }}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: typography.fontFamilies.sansSemiBold }}>
              {profile?.display_name || 'Add your name'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{profile?.email}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: layout.screenPaddingH }]}>
        MY RECIPES
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={myRecipes ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 20 }}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpen size={40} color={colors.textSecondary} strokeWidth={1.5} />}
              title="No recipes yet"
              subtitle="Recipes you submit will show up here."
            />
          }
        />
      )}

      <TouchableOpacity onPress={handleSignOut} style={[styles.signOutRow, { paddingHorizontal: layout.screenPaddingH }]}>
        <LogOut size={18} color={colors.destructive} strokeWidth={2} />
        <Text style={{ color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium }}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, lineHeight: 34 },
  section: { paddingVertical: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  saveNameBtn: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, marginTop: 'auto' },
});
