import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useUIStore } from '../../lib/stores/uiStore';
import { Button } from './Button';

/**
 * Global confirm dialog, driven by useUIStore().showConfirm(). Exists because
 * Alert.alert's multi-button form (e.g. "Cancel" / "Sign Out") has no web
 * implementation in react-native-web, unlike Modal, which does.
 */
export function ConfirmDialog() {
  const { colors, typography, layout } = useTheme();
  const { confirmDialog, hideConfirm } = useUIStore();

  if (!confirmDialog) return null;

  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm } = confirmDialog;

  const handleConfirm = () => {
    hideConfirm();
    onConfirm();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={hideConfirm}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={hideConfirm} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: layout.cardRadius }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            <Button variant="ghost" onPress={hideConfirm} style={styles.actionButton}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              onPress={handleConfirm}
              style={styles.actionButton}
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  title: {
    fontSize: 17,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 88,
  },
});
