import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function RecipeCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton height={160} borderRadius={8} />
      <View style={skeletonStyles.content}>
        <Skeleton height={16} width="80%" borderRadius={6} />
        <View style={skeletonStyles.row}>
          <Skeleton height={12} width={60} borderRadius={4} />
          <Skeleton height={12} width={40} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

export function RecipeListSkeleton() {
  return (
    <View style={skeletonStyles.grid}>
      {[1, 2, 3, 4].map((i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 8,
  },
  content: {
    gap: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
});
