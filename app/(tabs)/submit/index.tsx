import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../../lib/hooks/useTheme';
import { RecipeForm } from '../../../components/recipe/RecipeForm';

export default function SubmitScreen() {
  const { colors, typography, layout } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Submit a Recipe
        </Text>
      </View>
      <RecipeForm
        mode="create"
        onSaved={(recipeId) => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: recipeId } })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, lineHeight: 34 },
});
