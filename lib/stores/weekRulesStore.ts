import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealSlot } from '../database.types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type DayRule = {
  type: 'category' | 'fixed' | 'surpriseMe' | 'recipeBook';
  label: string;
  fixedMeal?: string;
  categories: string[];
  tags: string[];
  maxCookTime?: number;
  /** For 'recipeBook' rules — pull recipes only from this book */
  bookId?: string;
  bookName?: string;
};

// Rules keyed by slot for a single day
export type SlotRules = Partial<Record<MealSlot, DayRule>>;

type WeekRulesStore = {
  rules: Partial<Record<number, SlotRules>>;  // key = 0–6 (Sun–Sat)
  setSlotRule: (day: number, slot: MealSlot, rule: DayRule) => void;
  clearSlotRule: (day: number, slot: MealSlot) => void;
  clearDayRules: (day: number) => void;
};

export const useWeekRulesStore = create<WeekRulesStore>()(
  persist(
    (set) => ({
      rules: {},
      setSlotRule: (day, slot, rule) =>
        set((s) => ({
          rules: {
            ...s.rules,
            [day]: { ...(s.rules[day] ?? {}), [slot]: rule },
          },
        })),
      clearSlotRule: (day, slot) =>
        set((s) => {
          const dayRules = { ...(s.rules[day] ?? {}) };
          delete dayRules[slot];
          const next = { ...s.rules };
          if (Object.keys(dayRules).length === 0) {
            delete next[day];
          } else {
            next[day] = dayRules;
          }
          return { rules: next };
        }),
      clearDayRules: (day) =>
        set((s) => {
          const next = { ...s.rules };
          delete next[day];
          return { rules: next };
        }),
    }),
    {
      name: 'simmerdown-week-rules-v2', // new key to avoid migration issues
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
