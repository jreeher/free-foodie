/**
 * Cross-platform utilities for features that behave differently on web vs native.
 * Import from here instead of using platform-specific APIs directly.
 */
import { Platform } from 'react-native';

// ─── Clipboard ────────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  } else {
    const { default: Clipboard } = await import(
      // @ts-ignore — react-native Clipboard is not typed for dynamic import
      'react-native'
    );
    Clipboard.setString(text);
  }
}

// ─── Share ────────────────────────────────────────────────────────────────────

export async function shareText(message: string, title?: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ title, text: message });
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard(message);
    }
  } else {
    const { Share } = await import('react-native');
    await Share.share({ message, title });
  }
}

// ─── Image reading (for Supabase upload) ─────────────────────────────────────

/**
 * Read an image URI as an ArrayBuffer for uploading to Supabase Storage.
 * On web: uses fetch() which handles blob:, data:, and https: URIs natively.
 * On native: uses expo-file-system for file:// URIs; fetch() for remote URLs.
 */
export async function imageUriToArrayBuffer(uri: string): Promise<{ arrayBuffer: ArrayBuffer; ext: string }> {
  const cleanUri = uri.split('?')[0];
  const ext = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';

  if (Platform.OS === 'web') {
    // On web, fetch() handles blob:, data:, and https: URIs natively
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    return { arrayBuffer, ext };
  }

  const isRemote = uri.startsWith('http://') || uri.startsWith('https://');

  if (isRemote) {
    // Remote URL on native: download to temp file first
    const FileSystem = await import('expo-file-system');
    const tempPath = `${FileSystem.cacheDirectory}recipe_img_${Date.now()}.jpg`;
    const { uri: localUri } = await FileSystem.downloadAsync(uri, tempPath);
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { decode } = await import('base64-arraybuffer');
    return { arrayBuffer: decode(base64), ext };
  }

  // Local file:// URI on native
  const FileSystem = await import('expo-file-system');
  const { decode } = await import('base64-arraybuffer');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { arrayBuffer: decode(base64), ext };
}

/**
 * Read a local image URI as base64 (for the AI import feature).
 * On web: fetch blob URL → base64 via FileReader.
 * On native: expo-file-system.
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (data:image/jpeg;base64,)
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const FileSystem = await import('expo-file-system');
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
