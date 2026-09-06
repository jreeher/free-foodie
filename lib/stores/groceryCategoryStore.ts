import { create } from 'zustand';
import { StoreSection } from '../theme';

/**
 * In-memory session cache for ingredient → StoreSection mappings.
 * The authoritative store is `user_grocery_prefs` in Supabase.
 * This cache is populated optimistically when the user moves an item
 * and is cleared on app restart (Supabase is fetched fresh each time).
 */
type GroceryCategoryStore = {
  preferences: Record<string, StoreSection>;
  setPreference: (ingredientName: string, section: StoreSection) => void;
  getPreference: (ingredientName: string) => StoreSection | null;
  hydrate: (prefs: Record<string, StoreSection>) => void;
  clearAll: () => void;
};

export const useGroceryCategoryStore = create<GroceryCategoryStore>()((set, get) => ({
  preferences: {},

  setPreference: (name, section) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        [name.toLowerCase().trim()]: section,
      },
    })),

  getPreference: (name) => get().preferences[name.toLowerCase().trim()] ?? null,

  hydrate: (prefs) => set({ preferences: prefs }),

  clearAll: () => set({ preferences: {} }),
}));
