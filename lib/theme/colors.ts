export const palette = {
  // Warm neutrals
  warmWhite: '#FAFAF7',
  white: '#FFFFFF',
  warmCharcoal: '#2D2A26',
  warmGray: '#7A756E',
  warmDivider: '#EDEBE7',

  // Accents
  terracotta: '#C4654A',
  terracottaLight: '#D4826C',
  terracottaMuted: '#E8B5A5',
  sage: '#7A8B6F',
  sageMuted: '#8FA07D',

  // Dark mode surfaces
  darkBg: '#1A1917',
  darkSurface: '#252320',
  darkBorder: '#3A3632',
  darkText: '#F0EDE8',
  darkTextSecondary: '#9A948C',

  // Status
  destructive: '#C0392B',
  destructiveLight: '#E74C3C',
  success: '#27AE60',
  warning: '#F39C12',

  // Transparent
  shadowWarm: 'rgba(0,0,0,0.04)',
  overlayDark: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(255,255,255,0.9)',
} as const;

export const lightColors = {
  background: palette.warmWhite,
  surface: palette.white,
  surfaceElevated: palette.white,
  border: palette.warmDivider,
  borderFocus: palette.terracotta,

  textPrimary: palette.warmCharcoal,
  textSecondary: palette.warmGray,
  textInverse: palette.white,
  textOnAccent: palette.white,

  primary: palette.terracotta,
  primaryHover: '#B55A3F',
  primaryDisabled: palette.terracottaMuted,

  secondary: palette.sage,
  secondaryMuted: palette.sageMuted,

  destructive: palette.destructive,
  success: palette.success,
  warning: palette.warning,

  tabBar: palette.white,
  tabBarBorder: palette.warmDivider,
  tabIconActive: palette.terracotta,
  tabIconInactive: palette.warmGray,

  inputBackground: palette.white,
  inputBorder: palette.warmDivider,
  placeholder: '#B5B0A8',

  skeleton: '#EEECEA',
  skeletonHighlight: '#F5F3F0',

  cardShadow: palette.shadowWarm,
  overlay: palette.overlayDark,
} as const;

export const darkColors: typeof lightColors = {
  background: palette.darkBg,
  surface: palette.darkSurface,
  surfaceElevated: '#2E2B28',
  border: palette.darkBorder,
  borderFocus: palette.terracottaLight,

  textPrimary: palette.darkText,
  textSecondary: palette.darkTextSecondary,
  textInverse: palette.warmCharcoal,
  textOnAccent: palette.white,

  primary: palette.terracottaLight,
  primaryHover: '#E09080',
  primaryDisabled: '#7A4A3A',

  secondary: palette.sageMuted,
  secondaryMuted: '#7A8B6F',

  destructive: palette.destructiveLight,
  success: '#2ECC71',
  warning: '#F1C40F',

  tabBar: palette.darkSurface,
  tabBarBorder: palette.darkBorder,
  tabIconActive: palette.terracottaLight,
  tabIconInactive: palette.darkTextSecondary,

  inputBackground: '#2E2B28',
  inputBorder: palette.darkBorder,
  placeholder: '#6A6560',

  skeleton: '#2E2B28',
  skeletonHighlight: '#3A3632',

  cardShadow: 'rgba(0,0,0,0.3)',
  overlay: 'rgba(0,0,0,0.7)',
};

export type ColorScheme = typeof lightColors;
