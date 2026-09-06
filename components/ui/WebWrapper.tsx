import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

/**
 * On web, constrains the app to a phone-like max-width and centers it.
 * On native, renders children directly with no extra wrapping.
 */
export function WebWrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F0EDE8', // neutral page background behind the app column
    // Use 100dvh (dynamic viewport height) so the container respects the mobile
    // browser's bottom UI chrome (address bar, home indicator) and the tab bar
    // is never pushed below the visible area.
    ...(Platform.OS === 'web' ? ({ height: '100dvh', overflow: 'hidden' } as any) : {}),
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 680, // wider than phone — feels more like a web app on desktop
    // Subtle shadow to give the app "card" effect on desktop
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        } as any)
      : {}),
  },
});
