import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorScheme } from '../theme/colors';
import { textStyles, fontFamilies, fontSizes } from '../theme/typography';
import { spacing, layout, shadows } from '../theme/spacing';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors: ColorScheme = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    typography: { textStyles, fontFamilies, fontSizes },
    spacing,
    layout,
    shadows,
  };
}

export type Theme = ReturnType<typeof useTheme>;
