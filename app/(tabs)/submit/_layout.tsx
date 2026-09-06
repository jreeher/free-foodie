import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../../../lib/theme/colors';

export default function SubmitLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
