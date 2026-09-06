import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../lib/hooks/useTheme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  large?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightElement,
  large = false,
}: ScreenHeaderProps) {
  const { colors, typography, layout } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: layout.screenPaddingH,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          <Text
            style={[
              large ? styles.titleLarge : styles.title,
              {
                color: colors.textPrimary,
                fontFamily: large
                  ? typography.fontFamilies.serifDisplay
                  : typography.fontFamilies.sansBold,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  titleLarge: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
});
