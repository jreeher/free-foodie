import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';

interface InstructionStepProps {
  step: string;
  index: number;
  total: number;
}

export function InstructionStep({ step, index, total }: InstructionStepProps) {
  const { colors, typography } = useTheme();
  const [done, setDone] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setDone(!done)}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: done ? colors.skeleton : colors.surface,
          borderColor: done ? colors.secondary : colors.border,
        },
      ]}
    >
      {/* Step number */}
      <View
        style={[
          styles.stepBadge,
          {
            backgroundColor: done ? colors.secondary : colors.primary,
          },
        ]}
      >
        <Text
          style={[
            styles.stepNumber,
            { fontFamily: typography.fontFamilies.sansBold },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      {/* Instruction text */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.text,
            {
              color: done ? colors.textSecondary : colors.textPrimary,
              fontFamily: typography.fontFamilies.sansRegular,
              textDecorationLine: done ? 'line-through' : 'none',
            },
          ]}
        >
          {step}
        </Text>
        <Text
          style={[
            styles.stepIndicator,
            { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
          ]}
        >
          Step {index + 1} of {total}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    marginBottom: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  textContainer: {
    flex: 1,
    gap: 6,
  },
  text: {
    fontSize: 17,
    lineHeight: 26,
  },
  stepIndicator: {
    fontSize: 12,
    opacity: 0.6,
  },
});
