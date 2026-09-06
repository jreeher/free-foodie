import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onGenerate: (overwrite: boolean) => void;
  isGenerating: boolean;
  hasExistingEntries: boolean;
};

export function GenerateModal({
  visible,
  onClose,
  onGenerate,
  isGenerating,
  hasExistingEntries,
}: Props) {
  const { colors, typography } = useTheme();
  const [overwrite, setOverwrite] = useState(false);

  const handleGenerate = () => {
    onGenerate(overwrite);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
          ]}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Icon + title */}
          <View style={styles.titleRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Sparkles size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
              ]}
            >
              Generate Meals
            </Text>
          </View>

          {/* Subtitle */}
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
            ]}
          >
            Auto-fills your meal plan from your recipe library, keeping categories varied — no
            repeats two days in a row, and each category used at most twice per week.
          </Text>

          {/* Overwrite toggle — only shown if there are existing entries */}
          {hasExistingEntries && (
            <View style={[styles.toggleRow, { borderColor: colors.border }]}>
              <View style={styles.toggleLabel}>
                <Text
                  style={[
                    styles.toggleTitle,
                    { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium },
                  ]}
                >
                  Overwrite existing meals
                </Text>
                <Text
                  style={[
                    styles.toggleSub,
                    { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
                  ]}
                >
                  Replace all current entries for the week
                </Text>
              </View>
              <Switch
                value={overwrite}
                onValueChange={setOverwrite}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={overwrite ? colors.primary : colors.textSecondary}
              />
            </View>
          )}

          {/* Generate button */}
          <TouchableOpacity
            style={[
              styles.generateBtn,
              { backgroundColor: isGenerating ? colors.primaryDisabled ?? colors.border : colors.primary },
            ]}
            onPress={handleGenerate}
            disabled={isGenerating}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Sparkles size={18} color="#fff" strokeWidth={2} />
                <Text
                  style={[
                    styles.generateBtnText,
                    { fontFamily: typography.fontFamilies.sansSemiBold },
                  ]}
                >
                  Generate
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={isGenerating}>
            <Text
              style={[
                styles.cancelText,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
  },
  toggleSub: {
    fontSize: 12,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
  },
});
