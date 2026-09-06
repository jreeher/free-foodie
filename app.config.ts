import { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT;
const isPreview = variant === 'preview';
const isDev = variant === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? 'Simmer Down (Dev)' : isPreview ? 'Simmer Down (Preview)' : 'Simmer Down',
  slug: 'simmer-down',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    enabled: false,
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFAF7',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.simmerdown.app',
    infoPlist: {
      NSCameraUsageDescription: 'Simmer Down uses your camera to photograph recipes.',
      NSPhotoLibraryUsageDescription: 'Simmer Down accesses your photos to import recipe images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: isDev
        ? 'com.simmerdown.app.dev'
        : isPreview
        ? 'com.simmerdown.app.preview'
        : 'com.simmerdown.app',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-asset',
    [
      'expo-camera',
      {
        cameraPermission: 'Simmer Down uses your camera to photograph recipes.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Simmer Down accesses your photos to import recipe images.',
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Simmer Down to use Face ID for secure sign-in.',
      },
    ],
  ],
  scheme: 'simmerdown',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: '495e900a-4086-4e93-a4e2-adc0c29a52b1',
    },
  },
});
