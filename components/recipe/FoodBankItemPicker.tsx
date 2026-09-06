import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useFoodBankItems, groupByCategory } from '../../lib/hooks/useFoodBankItems';

interface FoodBankItemPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function FoodBankItemPicker({ selectedIds, onToggle }: FoodBankItemPickerProps) {
  const { colors, typography } = useTheme();
  const { data: items, isLoading } = useFoodBankItems();

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }

  const groups = groupByCategory(items ?? []);

  return (
    <View>
      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text
            style={[
              styles.groupLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            {group.category.toUpperCase()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {group.items.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onToggle(item.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? '#fff' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansMedium,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  groupLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
