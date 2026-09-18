export const palette = {
  // Warm neutrals
  warmWhite: '#FAFAF7',
  white: '#FFFFFF',
  warmCharcoal: '#2D2A26',
  warmGray: '#7A756E',
  warmDivider: '#EDEBE7',

  // Accents
  forestGreen: '#2E6B4E',
  forestGreenLight: '#4F9974',
  forestGreenMuted: '#AACDBB',
  sage: '#84957A',
  sageMuted: '#9BAD8C',
  gold: '#E2A13E',
  goldLight: '#EEBB66',

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
  borderFocus: palette.forestGreen,

  textPrimary: palette.warmCharcoal,
  textSecondary: palette.warmGray,
  textInverse: palette.white,
  textOnAccent: palette.white,

  primary: palette.forestGreen,
  primaryHover: '#255A40',
  primaryDisabled: palette.forestGreenMuted,

  secondary: palette.sage,
  secondaryMuted: palette.sageMuted,

  rating: palette.gold,

  destructive: palette.destructive,
  success: palette.success,
  warning: palette.warning,

  tabBar: palette.white,
  tabBarBorder: palette.warmDivider,
  tabIconActive: palette.forestGreen,
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
  borderFocus: palette.forestGreenLight,

  textPrimary: palette.darkText,
  textSecondary: palette.darkTextSecondary,
  textInverse: palette.warmCharcoal,
  textOnAccent: palette.white,

  primary: palette.forestGreenLight,
  primaryHover: '#6BB490',
  primaryDisabled: '#2E4A38',

  secondary: palette.sageMuted,
  secondaryMuted: palette.sage,

  rating: palette.goldLight,

  destructive: palette.destructiveLight,
  success: '#2ECC71',
  warning: '#F1C40F',

  tabBar: palette.darkSurface,
  tabBarBorder: palette.darkBorder,
  tabIconActive: palette.forestGreenLight,
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
