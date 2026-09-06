import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useAddMealPlanEntry } from '../../lib/hooks/useMealPlan';
import { useProfile } from '../../lib/hooks/useAuth';
import {
  getWeekStart,
  getWeekDates,
  formatDayLabel,
  isToday,
} from '../../lib/utils/dates';
import { MealSlot } from '../../lib/database.types';

const SLOT_OPTIONS: { slot: MealSlot; label: string; icon: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { slot: 'lunch', label: 'Lunch', icon: '🥗' },
  { slot: 'dinner', label: 'Dinner', icon: '🍽️' },
];

type Props = {
  visible: boolean;
  recipeId: string;
  recipeTitle: string;
  onClose: () => void;
};

export function AddToPlanModal({ visible, recipeId, recipeTitle, onClose }: Props) {
  const { colors, typography } = useTheme();
  const profile = useProfile();
  const addEntry = useAddMealPlanEntry();

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today if it's in the current week, else Monday
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return weekDates.includes(todayStr) ? todayStr : weekDates[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner');

  // Determine which slots to show based on preferences
  const mealSlotsSetting = profile?.preferences?.meal_slots ?? 'dinner_only';
  const visibleSlots = useMemo((): typeof SLOT_OPTIONS => {
    if (mealSlotsSetting === 'all') return SLOT_OPTIONS;
    if (mealSlotsSetting === 'lunch_dinner') return SLOT_OPTIONS.filter((s) => s.slot !== 'breakfast');
    return SLOT_OPTIONS.filter((s) => s.slot === 'dinner');
  }, [mealSlotsSetting]);

  const handleAdd = () => {
    addEntry.mutate(
      {
        weekStart,
        date: selectedDate,
        slot: selectedSlot,
        recipeId,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay },
              ]}
            >
              Add to Plan
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular },
              ]}
              numberOfLines={1}
            >
              {recipeTitle}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Day picker */}
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            WHICH DAY?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRow}
          >
            {weekDates.map((date) => {
              const { weekday, date: dateStr } = formatDayLabel(date);
              const today = isToday(date);
              const selected = selectedDate === date;

              return (
                <TouchableOpacity
                  key={date}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayChipWeekday,
                      {
                        color: selected ? '#fff' : colors.textSecondary,
                        fontFamily: typography.fontFamilies.sansRegular,
                      },
                    ]}
                  >
                    {weekday}
                  </Text>
                  <Text
                    style={[
                      styles.dayChipDate,
                      {
                        color: selected ? '#fff' : colors.textPrimary,
                        fontFamily: typography.fontFamilies.sansSemiBold,
                      },
                    ]}
                  >
                    {dateStr.split(' ')[1]}
                  </Text>
                  {today && (
                    <View
                      style={[
                        styles.todayDot,
                        { backgroundColor: selected ? 'rgba(255,255,255,0.7)' : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Slot picker */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamilies.sansSemiBold,
                marginTop: 24,
              },
            ]}
          >
            WHICH MEAL?
          </Text>
          <View style={styles.slotRow}>
            {visibleSlots.map(({ slot, label, icon }) => {
              const selected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  style={[
                    styles.slotChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.slotIcon}>{icon}</Text>
                  <Text
                    style={[
                      styles.slotLabel,
                      {
                        color: selected ? '#fff' : colors.textPrimary,
                        fontFamily: selected
                          ? typography.fontFamilies.sansSemiBold
                          : typography.fontFamilies.sansRegular,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {selected && <Check size={14} color="#fff" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: addEntry.isPending ? colors.border : colors.primary },
            ]}
            onPress={handleAdd}
            disabled={addEntry.isPending}
          >
            {addEntry.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text
                style={[
                  styles.addButtonText,
                  { fontFamily: typography.fontFamilies.sansSemiBold },
                ]}
              >
                Add to Plan
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 56,
    gap: 2,
  },
  dayChipWeekday: {
    fontSize: 11,
  },
  dayChipDate: {
    fontSize: 16,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  slotIcon: {
    fontSize: 18,
  },
  slotLabel: {
    fontSize: 15,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  addButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
