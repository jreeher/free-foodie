import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { Ingredient } from '../../lib/database.types';
import { scaleAmount } from '../../lib/utils/fractions';

interface IngredientRowProps {
  ingredient: Ingredient;
  servingsMultiplier?: number;
  showGroup?: boolean;
}

export function IngredientRow({
  ingredient,
  servingsMultiplier = 1,
  showGroup = false,
}: IngredientRowProps) {
  const { colors, typography } = useTheme();

  const scaledAmount = servingsMultiplier !== 1 && ingredient.amount
    ? scaleAmount(ingredient.amount, servingsMultiplier)
    : ingredient.amount;

  const quantityStr = [scaledAmount, ingredient.unit].filter(Boolean).join(' ');

  return (
    <View style={styles.row}>
      <View style={styles.bullet}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.nameContainer}>
        <Text
          style={[
            styles.name,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular },
          ]}
        >
          {ingredient.name}
        </Text>
        {ingredient.group && showGroup ? (
          <Text style={[styles.group, { color: colors.textSecondary }]}>
            {ingredient.group}
          </Text>
        ) : null}
      </View>
      {quantityStr ? (
        <Text
          style={[
            styles.quantity,
            { color: colors.textPrimary, fontFamily: typography.fontFamilies.mono },
          ]}
        >
          {quantityStr}
        </Text>
      ) : null}
    </View>
  );
}

export function IngredientGroupHeader({ label }: { label: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={[
        styles.groupHeader,
        {
          color: colors.textSecondary,
          fontFamily: typography.fontFamilies.sansSemiBold,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    gap: 10,
  },
  bullet: {
    paddingTop: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    lineHeight: 22,
  },
  group: {
    fontSize: 12,
    marginTop: 1,
  },
  quantity: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    minWidth: 60,
  },
  groupHeader: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingVertical: 10,
    paddingTop: 18,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
});
