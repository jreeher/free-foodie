import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const { colors, typography, layout } = useTheme();

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.textOnAccent },
    },
    secondary: {
      container: { backgroundColor: colors.secondary },
      text: { color: colors.textOnAccent },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      },
      text: { color: colors.primary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primary },
    },
    destructive: {
      container: { backgroundColor: colors.destructive },
      text: { color: '#FFFFFF' },
    },
  };

  const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
      text: { ...typography.textStyles.labelSmall },
    },
    md: {
      container: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: layout.buttonRadius },
      text: { ...typography.textStyles.labelMedium },
    },
    lg: {
      container: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: layout.buttonRadius },
      text: { ...typography.textStyles.headingSmall },
    },
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text style={[variantStyles[variant].text, sizeStyles[size].text, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
});
