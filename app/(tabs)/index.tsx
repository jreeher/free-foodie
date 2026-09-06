import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useUserPantry, useRemovePantryItem, PantryItem } from '../../lib/hooks/useUserPantry';
import { PantryItemRow } from '../../components/pantry/PantryItemRow';
import { AddPantryModal } from '../../components/pantry/AddPantryModal';
import { EmptyState } from '../../components/ui/EmptyState';

function groupByCategory(items: PantryItem[]): { category: string; items: PantryItem[] }[] {
  const groups: { category: string; items: PantryItem[] }[] = [];
  for (const item of items) {
    const category = item.food_bank_item.category;
    const existing = groups.find((g) => g.category === category);
    if (existing) existing.items.push(item);
    else groups.push({ category, items: [item] });
  }
  return groups;
}

type Row = { type: 'header'; category: string } | { type: 'item'; item: PantryItem };

export default function PantryScreen() {
  const { colors, typography, layout } = useTheme();
  const { data: pantryItems, isLoading, refetch, isRefetching } = useUserPantry();
  const removeItem = useRemovePantryItem();
  const [showAddModal, setShowAddModal] = useState(false);

  const groups = groupByCategory(pantryItems ?? []);
  const rows: Row[] = groups.flatMap((g) => [
    { type: 'header' as const, category: g.category },
    ...g.items.map((item) => ({ type: 'item' as const, item })),
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          My Pantry
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus color="#fff" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => (row.type === 'header' ? `h-${row.category}` : row.item.id)}
          contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: row }) =>
            row.type === 'header' ? (
              <Text style={[styles.groupLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                {row.category.toUpperCase()}
              </Text>
            ) : (
              <PantryItemRow item={row.item} onRemove={(id) => removeItem.mutate(id)} />
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon={<ShoppingBasket size={48} color={colors.textSecondary} strokeWidth={1.5} />}
              title="Your pantry is empty"
              subtitle="Add items you've received from the food bank to see recipes you can make."
              actionLabel="Add Items"
              onAction={() => setShowAddModal(true)}
            />
          }
        />
      )}

      <AddPantryModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 30, lineHeight: 36 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { fontSize: 11, letterSpacing: 1.5, marginTop: 16, marginBottom: 6 },
});
