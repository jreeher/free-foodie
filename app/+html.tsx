import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML template for the web build.
 * Sets viewport-fit=cover so mobile browsers report accurate
 * safe-area-inset-bottom values for the tab bar and bottom padding.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Resets body/html scroll styles so the app fills the screen correctly */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
