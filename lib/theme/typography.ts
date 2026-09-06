import { Platform } from 'react-native';

export const fontFamilies = {
  // Display / headings
  serifDisplay: 'DMSerifDisplay_400Regular',
  serifDisplayItalic: 'DMSerifDisplay_400Regular_Italic',

  // Body / UI
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  sansItalic: 'DMSans_400Regular_Italic',

  // Quantities / measurements
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  '2xl': 26,
  '3xl': 30,
  '4xl': 36,
  '5xl': 44,
} as const;

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 1.8,
} as const;

export const letterSpacings = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const textStyles = {
  displayLarge: {
    fontFamily: fontFamilies.serifDisplay,
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  displayMedium: {
    fontFamily: fontFamilies.serifDisplay,
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  displaySmall: {
    fontFamily: fontFamilies.serifDisplay,
    fontSize: fontSizes['2xl'],
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
  },
  headingLarge: {
    fontFamily: fontFamilies.sansBold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.snug,
  },
  headingMedium: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
  },
  headingSmall: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.snug,
  },
  bodyLarge: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  labelMedium: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.snug,
  },
  labelSmall: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },
  captionUppercase: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.snug,
    letterSpacing: letterSpacings.widest,
    textTransform: 'uppercase' as const,
  },
  quantity: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  quantityLarge: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  },
  recipeInstruction: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
} as const;
