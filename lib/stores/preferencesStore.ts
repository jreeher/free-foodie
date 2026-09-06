import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesState {
  recipeViewMode: 'grid' | 'list';
  setRecipeViewMode: (mode: 'grid' | 'list') => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      recipeViewMode: 'grid',
      setRecipeViewMode: (mode) => set({ recipeViewMode: mode }),
    }),
    {
      name: 'simmerdown-preferences-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
