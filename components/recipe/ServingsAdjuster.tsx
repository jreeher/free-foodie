import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, Users } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';

interface ServingsAdjusterProps {
  baseServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
}

export function ServingsAdjuster({ baseServings, currentServings, onChange }: ServingsAdjusterProps) {
  const { colors, typography } = useTheme();

  const decrement = () => {
    if (currentServings <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(currentServings - 1);
  };

  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(currentServings + 1);
  };

  const multiplier = currentServings / baseServings;
  const isModified = multiplier !== 1;

  return (
    <View style={styles.container}>
      <Users size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text
        style={[
          styles.label,
          { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
        ]}
      >
        Serves
      </Text>
      <TouchableOpacity
        onPress={decrement}
        disabled={currentServings <= 1}
        style={[
          styles.button,
          { borderColor: colors.border, backgroundColor: colors.surface },
          currentServings <= 1 && styles.buttonDisabled,
        ]}
        hitSlop={8}
      >
        <Minus size={14} color={currentServings <= 1 ? colors.textSecondary : colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.valueContainer}>
        <Text
          style={[
            styles.value,
            {
              color: isModified ? colors.primary : colors.textPrimary,
              fontFamily: typography.fontFamilies.sansBold,
            },
          ]}
        >
          {currentServings}
        </Text>
      </View>

      <TouchableOpacity
        onPress={increment}
        style={[
          styles.button,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        hitSlop={8}
      >
        <Plus size={14} color={colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      {isModified && (
        <TouchableOpacity
          onPress={() => { onChange(baseServings); }}
          style={styles.resetButton}
          hitSlop={8}
        >
          <Text
            style={[
              styles.resetText,
              { color: colors.primary, fontFamily: typography.fontFamilies.sansRegular },
            ]}
          >
            reset
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    marginRight: 4,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueContainer: {
    minWidth: 28,
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
  },
  resetButton: {
    marginLeft: 4,
  },
  resetText: {
    fontSize: 13,
  },
});
