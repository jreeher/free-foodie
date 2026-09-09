import { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT;
const isPreview = variant === 'preview';
const isDev = variant === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? 'Free Foodie (Dev)' : isPreview ? 'Free Foodie (Preview)' : 'Free Foodie',
  slug: 'free-foodie',
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
    bundleIdentifier: 'com.freefoodie.app',
    infoPlist: {
      NSCameraUsageDescription: 'Free Foodie uses your camera to scan food bank items and photograph recipes.',
      NSPhotoLibraryUsageDescription: 'Free Foodie accesses your photos to import recipe images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: isDev
        ? 'com.freefoodie.app.dev'
        : isPreview
        ? 'com.freefoodie.app.preview'
        : 'com.freefoodie.app',
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
        cameraPermission: 'Free Foodie uses your camera to scan food bank items and photograph recipes.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Free Foodie accesses your photos to import recipe images.',
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Free Foodie to use Face ID for secure sign-in.',
      },
    ],
  ],
  scheme: 'freefoodie',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: '1a7296ee-f5d7-423b-ac65-f6f2c78e3e4a',
    },
  },
});
