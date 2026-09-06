import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Plus, X, Clock, ChefHat, ArrowLeftRight } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { MealSlot } from '../../lib/database.types';
import { MealPlanEntryWithRecipe } from '../../lib/hooks/useMealPlan';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const SLOT_ICONS: Record<MealSlot, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
};

export type SwapMode = 'source' | 'target' | 'empty-target' | null;

type Props = {
  slot: MealSlot;
  entry: MealPlanEntryWithRecipe | undefined;
  isPast: boolean;
  onAdd: () => void;
  onRemove: (entryId: string, mealPlanId: string) => void;
  onPress: (entry: MealPlanEntryWithRecipe) => void;
  // Swap mode
  swapMode?: SwapMode;
  onSwapSelect?: () => void;
  onSwapDay?: (entry: MealPlanEntryWithRecipe) => void;
  // Side dishes
  onAddSide?: (entry: MealPlanEntryWithRecipe) => void;
  onRemoveSide?: (entry: MealPlanEntryWithRecipe, sideIndex: number) => void;
};

export function MealSlotRow({
  slot, entry, isPast, onAdd, onRemove, onPress,
  swapMode, onSwapSelect, onSwapDay,
  onAddSide, onRemoveSide,
}: Props) {
  const { colors, typography } = useTheme();

  if (!entry) {
    // Empty slot in swap mode — show as a moveable target
    if (swapMode === 'empty-target') {
      return (
        <TouchableOpacity
          style={[styles.emptySlot, { borderColor: '#2ECC71', borderStyle: 'solid', backgroundColor: '#2ECC7108' }]}
          onPress={onSwapSelect}
          activeOpacity={0.7}
        >
          <Text style={styles.slotIcon}>{SLOT_ICONS[slot]}</Text>
          <Text style={[styles.slotLabel, { color: '#2ECC71', fontFamily: typography.fontFamilies.sansMedium }]}>
            Move {SLOT_LABELS[slot]} here
          </Text>
          <ArrowLeftRight size={15} color="#2ECC71" strokeWidth={2} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.emptySlot,
          { borderColor: colors.border },
          swapMode ? { opacity: 0.35 } : undefined,
        ]}
        onPress={onAdd}
        activeOpacity={0.6}
        disabled={!!swapMode}
      >
        <Text style={styles.slotIcon}>{SLOT_ICONS[slot]}</Text>
        <Text style={[styles.slotLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
          {SLOT_LABELS[slot]}
        </Text>
        <View style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Plus size={14} color={colors.primary} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    );
  }

  const recipe = entry.recipes;
  const label = recipe?.title ?? entry.custom_meal_name ?? '';
  const isCustom = !recipe;
  const sides = entry.side_dishes ?? [];

  const isSource = swapMode === 'source';
  const isTarget = swapMode === 'target';
  const dimmed = !!swapMode && !isSource && !isTarget;

  const borderColor = isSource ? colors.primary : isTarget ? '#2ECC71' : colors.border;
  const bgColor = isSource ? colors.primary + '10' : isTarget ? '#2ECC7110' : colors.surface;

  return (
    <View style={[styles.entryWrapper, dimmed && { opacity: 0.35 }]}>
      <View style={[styles.filledSlot, { backgroundColor: bgColor, borderColor }, (isSource || isTarget) && { borderWidth: 2 }]}>

        {/* Add side button — left column (hidden in swap mode) */}
        {!swapMode && (
          <TouchableOpacity
            style={[styles.addSideBtn, { borderRightColor: colors.border }]}
            onPress={() => onAddSide?.(entry)}
            hitSlop={4}
          >
            <Plus size={13} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Main tappable area */}
        <TouchableOpacity
          style={styles.mainContent}
          onPress={isTarget ? onSwapSelect : (isSource ? undefined : () => onPress(entry))}
          activeOpacity={0.75}
        >
          {/* Thumbnail */}
          {recipe?.image_url ? (
            <Image source={{ uri: recipe.image_url }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              {isCustom ? (
                <Text style={styles.slotIconSmall}>{SLOT_ICONS[slot]}</Text>
              ) : (
                <ChefHat size={16} color={colors.primary} strokeWidth={1.5} />
              )}
            </View>
          )}

          {/* Content */}
          <View style={styles.slotContent}>
            <Text style={[styles.slotLabelSmall, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
              {SLOT_ICONS[slot]} {SLOT_LABELS[slot]}
            </Text>
            <Text
              style={[styles.mealTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {recipe?.total_time_minutes && !isSource && !isTarget && (
              <View style={styles.timeRow}>
                <Clock size={11} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.timeText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                  {recipe.total_time_minutes} min
                </Text>
              </View>
            )}
            {isTarget && (
              <Text style={[styles.swapHint, { color: '#2ECC71', fontFamily: typography.fontFamilies.sansMedium }]}>
                Tap to swap
              </Text>
            )}
            {isSource && (
              <Text style={[styles.swapHint, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Being moved…
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Right-side controls */}
        {isTarget ? (
          <ArrowLeftRight size={16} color="#2ECC71" strokeWidth={2} style={{ marginRight: 10 }} />
        ) : (
          <View style={styles.rightButtons}>
            {!swapMode && (
              <TouchableOpacity
                style={styles.swapInitBtn}
                onPress={() => onSwapDay?.(entry)}
                hitSlop={8}
              >
                <ArrowLeftRight size={14} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => !swapMode && onRemove(entry.id, entry.meal_plan_id)}
              hitSlop={8}
              disabled={!!swapMode}
            >
              <X size={14} color={swapMode ? 'transparent' : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sides list */}
      {sides.length > 0 && !swapMode && (
        <View style={[styles.sidesList, { borderColor: colors.primary + '40' }]}>
          {sides.map((side, i) => (
            <View key={i} style={styles.sideRow}>
              <Text style={[styles.sideText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                • {side}
              </Text>
              <TouchableOpacity onPress={() => onRemoveSide?.(entry, i)} hitSlop={8}>
                <X size={12} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    gap: 8,
    marginBottom: 6,
  },
  slotIcon: {
    fontSize: 15,
  },
  slotIconSmall: {
    fontSize: 13,
  },
  slotLabel: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  entryWrapper: {
    marginBottom: 6,
  },
  filledSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  addSideBtn: {
    width: 30,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 52,
    height: 52,
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotContent: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 10,
    gap: 2,
  },
  slotLabelSmall: {
    fontSize: 11,
  },
  mealTitle: {
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
  },
  swapHint: {
    fontSize: 11,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapInitBtn: {
    padding: 10,
  },
  removeButton: {
    padding: 10,
  },
  sidesList: {
    marginLeft: 30,
    paddingLeft: 10,
    borderLeftWidth: 2,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 1,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  sideText: {
    fontSize: 12,
    flex: 1,
  },
});
