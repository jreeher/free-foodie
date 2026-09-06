import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  icon?: string;
}

export function Badge({ label, variant = 'default', style, icon }: BadgeProps) {
  const { colors, typography, layout } = useTheme();

  const variantConfig: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    default: {
      bg: colors.border,
      text: colors.textSecondary,
    },
    primary: {
      bg: colors.primary + '20',
      text: colors.primary,
    },
    secondary: {
      bg: colors.secondary + '20',
      text: colors.secondary,
    },
    outline: {
      bg: 'transparent',
      text: colors.textSecondary,
      border: colors.border,
    },
    muted: {
      bg: colors.skeleton,
      text: colors.textSecondary,
    },
  };

  const config = variantConfig[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderRadius: layout.pillRadius,
          borderWidth: config.border ? 1 : 0,
          borderColor: config.border,
        },
        style,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        style={[
          styles.text,
          { color: config.text, fontFamily: typography.fontFamilies.sansMedium },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
});
