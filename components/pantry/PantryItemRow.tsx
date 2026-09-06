import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { PantryItem } from '../../lib/hooks/useUserPantry';

interface PantryItemRowProps {
  item: PantryItem;
  onRemove: (pantryRowId: string) => void;
}

export function PantryItemRow({ item, onRemove }: PantryItemRowProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
        {item.food_bank_item.name}
      </Text>
      <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={8}>
        <X color={colors.textSecondary} size={18} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontSize: 15,
  },
});
