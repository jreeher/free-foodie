import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/hooks/useTheme';

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 16, readonly = false }: StarRatingProps) {
  const { colors } = useTheme();
  const filled = value ?? 0;

  const handlePress = (star: number) => {
    if (readonly || !onChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Tap same star to clear
    onChange(star === filled ? 0 : star);
  };

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={readonly}
          hitSlop={4}
          style={{ marginRight: star < 5 ? 2 : 0 }}
        >
          <Star
            size={size}
            color={star <= filled ? colors.primary : colors.border}
            fill={star <= filled ? colors.primary : 'transparent'}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
