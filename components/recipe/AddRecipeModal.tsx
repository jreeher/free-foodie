import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Edit3, Camera, Link, ChevronRight, List } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onBulkImport?: () => void;
};

export function AddRecipeModal({ visible, onClose, onBulkImport }: Props) {
  const { colors, typography } = useTheme();

  const navigate = (path: string, params?: object) => {
    onClose();
    if (params) {
      router.push({ pathname: path as any, params });
    } else {
      router.push(path as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
            ]}
          >
            Add a Recipe
          </Text>

          {/* Start from Scratch */}
          <TouchableOpacity
            style={[styles.optionBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => navigate('/(tabs)/recipes/add')}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Edit3 color={colors.primary} size={22} strokeWidth={1.75} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Start from Scratch
              </Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Build your own recipe step by step
              </Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>

          {/* Upload a Photo */}
          <TouchableOpacity
            style={[styles.optionBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => navigate('/(tabs)/recipes/import', { tab: 'photo' })}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.secondary + '25' }]}>
              <Camera color={colors.secondary} size={22} strokeWidth={1.75} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Upload a Photo
              </Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Snap or upload from a cookbook or card
              </Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>

          {/* Paste a URL */}
          <TouchableOpacity
            style={[styles.optionBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => navigate('/(tabs)/recipes/import', { tab: 'url' })}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#5B8DEF18' }]}>
              <Link color="#5B8DEF" size={22} strokeWidth={1.75} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Paste a URL
              </Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Import from any recipe website instantly
              </Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>

          {/* Bulk Import */}
          <TouchableOpacity
            style={[styles.optionBox, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => { onClose(); onBulkImport?.(); }}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#2ECC7118' }]}>
              <List color="#2ECC71" size={22} strokeWidth={1.75} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                Bulk Import
              </Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Add many recipes at once by title
              </Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 16,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
