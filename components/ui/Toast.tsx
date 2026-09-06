import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useUIStore, Toast as ToastType } from '../../lib/stores/uiStore';

function ToastItem({ toast }: { toast: ToastType }) {
  const { colors, typography } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const { dismissToast } = useUIStore();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20 }),
    ]).start();
  }, []);

  const iconMap = {
    success: <CheckCircle color="#27AE60" size={18} strokeWidth={2} />,
    error: <XCircle color={colors.destructive} size={18} strokeWidth={2} />,
    info: <Info color={colors.primary} size={18} strokeWidth={2} />,
  };

  const bgMap = {
    success: colors.surface,
    error: colors.surface,
    info: colors.surface,
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bgMap[toast.type],
          opacity,
          transform: [{ translateY }],
          borderColor: colors.border,
        },
      ]}
    >
      {iconMap[toast.type]}
      <Text
        style={[
          styles.message,
          { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium },
        ]}
        numberOfLines={2}
      >
        {toast.message}
      </Text>
      <TouchableOpacity onPress={() => dismissToast(toast.id)} hitSlop={12}>
        <X color={colors.textSecondary} size={16} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();
  const insets = useSafeAreaInsets();

  if (!toasts.length) return null;

  return (
    <View
      style={[
        styles.container,
        { bottom: insets.bottom + 80 },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
