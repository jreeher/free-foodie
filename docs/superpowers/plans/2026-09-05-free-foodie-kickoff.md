# Free Foodie Kickoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the forked Simmer Down codebase into Free Foodie per `docs/superpowers/specs/2026-09-05-free-foodie-kickoff-design.md`.

**Architecture:** See the design doc. Summary: rebrand config → delete obsolete Simmer Down files → new Supabase schema (2 migrations) → rewritten `database.types.ts` → new/rewritten hooks → new shared components → 4-tab screen set → pantry photo-scan edge function → verification.

**Tech Stack:** Expo SDK 52, Expo Router v4, Supabase JS v2, TanStack Query v5, Zustand, Lucide icons, existing theme system (`lib/theme/`). No new dependencies — everything needed (`expo-image-picker`, `expo-image-manipulator`, `expo-haptics`, etc.) is already in `package.json`.

**Adaptation note:** This repo has no test framework installed (no jest, no test script) and the kickoff's definition of done is manual/functional, not test-coverage-based. Installing one is out of scope for this kickoff. Each task's verification step is `npx tsc --noEmit` (catches the large majority of mistakes in a typed RN codebase — wrong prop names, wrong hook signatures, wrong table columns) plus, for the final phase, running the app in the browser preview. SQL migration tasks are verified by careful review only, since no live Supabase project is connected in this session (`.mcp.json`'s `supabase` server failed to connect, and no project credentials exist yet anyway per the design doc's placeholder decision) — the user must run `supabase db push` (or paste the SQL into the Supabase SQL editor) once they've created the project, and should sanity-check the two migration files as part of their morning review.

**Execution mode:** Inline, in this session, on a dedicated branch (`free-foodie-kickoff`) — not on `master`. Chosen over subagent-driven-development because this session already holds full context from reading ~25 files across the codebase during design; re-deriving that context in fresh per-task subagents would cost more than it saves for a change this interconnected (types flow from migrations → hooks → components → screens). Master stays untouched so the user can review the whole diff (or a PR) in the morning before merging.

---

### Task 0: Branch setup

**Files:** none (git operation only)

- [ ] **Step 1:** Create and switch to the branch
```bash
git checkout -b free-foodie-kickoff
```
- [ ] **Step 2:** Verify
```bash
git branch --show-current
```
Expected: `free-foodie-kickoff`

---

### Task 1: Rebrand config

**Files:**
- Modify: `app.config.ts`
- Modify: `package.json:1-2`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `app/_layout.tsx:50` (persister key)

- [ ] **Step 1: Rewrite `app.config.ts`**

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT;
const isPreview = variant === 'preview';
const isDev = variant === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? 'Free Foodie (Dev)' : isPreview ? 'Free Foodie (Preview)' : 'Free Foodie',
  slug: 'free-foodie',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    enabled: false,
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFAF7',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.freefoodie.app',
    infoPlist: {
      NSCameraUsageDescription: 'Free Foodie uses your camera to scan food bank items and photograph recipes.',
      NSPhotoLibraryUsageDescription: 'Free Foodie accesses your photos to import recipe images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: isDev
        ? 'com.freefoodie.app.dev'
        : isPreview
        ? 'com.freefoodie.app.preview'
        : 'com.freefoodie.app',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-asset',
    [
      'expo-camera',
      {
        cameraPermission: 'Free Foodie uses your camera to scan food bank items and photograph recipes.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Free Foodie accesses your photos to import recipe images.',
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Free Foodie to use Face ID for secure sign-in.',
      },
    ],
  ],
  scheme: 'freefoodie',
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      // TODO(user): replace with a real EAS project id — run `eas init` under your
      // Expo account. The Simmer Down id below is intentionally left as a placeholder
      // marker, NOT reused, since builds under it would go to the wrong EAS project.
      projectId: 'REPLACE_WITH_NEW_EAS_PROJECT_ID',
    },
  },
});
```

- [ ] **Step 2: Update `package.json` name**

Change line 2 from `"name": "simmer-down",` to `"name": "free-foodie",`. Leave everything else in the file untouched.

- [ ] **Step 3: Reset `.env` and `.env.example` to placeholders**

`.env.example` (already placeholder — leave as-is, just confirm it reads):
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

`.env` — overwrite with the same placeholder content (the old file has real Simmer Down credentials, which must not be reused for a different app/database):
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

- [ ] **Step 4: Rename the query-cache persister key in `app/_layout.tsx`**

Find:
```typescript
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'simmerdown-query-cache-v1',
  throttleTime: 1000, // write at most once per second to avoid thrashing
});
```
Replace `key: 'simmerdown-query-cache-v1',` with `key: 'freefoodie-query-cache-v1',`. No other change in this file for this task.

- [ ] **Step 5: Verify**
```bash
npx tsc --noEmit
```
Expected: same pre-existing error count as before this task (this task touches no types) — really just confirming the edit didn't break JSON/TS syntax. A quick `Get-Content .env` / `cat app.config.ts` visual check is fine too.

- [ ] **Step 6: Commit**
```bash
git add app.config.ts package.json .env .env.example app/_layout.tsx
git commit -m "Rebrand config: Free Foodie name, bundle ids, cache key, env placeholders"
```

---

### Task 2: Fix pre-existing bug + copy in `(auth)` screens

While touching these files for copy changes, fix a real bug found during design research: `app/(auth)/login.tsx` uses `Platform.OS` in its `KeyboardAvoidingView` but never imports `Platform` from `react-native` — this throws `ReferenceError: Platform is not defined` on Android/web. Logged in the decisions log as an implementation-phase finding.

**Files:**
- Modify: `app/(auth)/login.tsx`
- Modify: `app/(auth)/signup.tsx`

- [ ] **Step 1: Fix the missing import and rebrand copy in `login.tsx`**

Change the react-native import block (currently missing `Platform`):
```typescript
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
```

Change the logo/tagline block:
```typescript
        <View style={s.logo}>
          <Text style={s.logoText}>Free Foodie</Text>
          <Text style={s.tagline}>Recipes for what you have</Text>
        </View>
```

- [ ] **Step 2: Rebrand copy in `signup.tsx`**

Change:
```typescript
        <View style={s.logo}>
          <Text style={s.logoText}>Free Foodie</Text>
        </View>

        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Join and start sharing recipes with your community.</Text>
```

- [ ] **Step 3: Verify**
```bash
npx tsc --noEmit
```
Expected: no new errors from these two files.

- [ ] **Step 4: Commit**
```bash
git add app/(auth)/login.tsx app/(auth)/signup.tsx
git commit -m "Fix missing Platform import in login screen; rebrand auth copy"
```

---

### Task 3: Delete obsolete Simmer Down files

**Files:** deletions only, exact list below.

- [ ] **Step 1: Delete screens**
```bash
git rm -r "app/(tabs)/plan" "app/(tabs)/marketplace" "app/(tabs)/settings" "app/(tabs)/grocery"
```

- [ ] **Step 2: Delete components**
```bash
git rm -r components/meal-plan
git rm components/recipe/AddToBookModal.tsx components/recipe/RecipeCard.tsx components/recipe/AddRecipeModal.tsx
```

- [ ] **Step 3: Delete hooks**
```bash
git rm lib/hooks/useMealPlan.ts lib/hooks/useMarketplace.ts lib/hooks/useGroceryList.ts lib/hooks/useHousehold.ts lib/hooks/useHouseholdSync.ts lib/hooks/useRecipeBooks.ts
```

- [ ] **Step 4: Delete stores**
```bash
git rm lib/stores/weekRulesStore.ts lib/stores/groceryCategoryStore.ts lib/stores/preferencesStore.ts
```

- [ ] **Step 5: Delete utils**
```bash
git rm lib/utils/groceryAggregation.ts lib/utils/exportRecipes.ts
```

- [ ] **Step 6: Delete the dropped recipe-photo-import feature**
```bash
git rm -r supabase/functions/extract-recipe-image
git rm "app/(tabs)/recipes/import.tsx" "app/(tabs)/recipes/import-review.tsx"
```

- [ ] **Step 7: Delete old recipe add screen (replaced by shared RecipeForm used from Submit tab)**
```bash
git rm "app/(tabs)/recipes/add.tsx"
```

- [ ] **Step 8: Delete all old migrations**
```bash
git rm supabase/migrations/*.sql
```

- [ ] **Step 9: Verify — repo builds are expected to be BROKEN after this step**

This is expected. `npx tsc --noEmit` will show many errors (missing modules, missing types) until Tasks 4–9 replace what was deleted. Do not attempt to fix errors yet — just confirm the deletions match this list and nothing else:
```bash
git status
```
Expected: exactly the files listed above show as deleted, nothing else.

- [ ] **Step 10: Commit**
```bash
git commit -m "Delete Simmer Down features not needed for Free Foodie (meal plan, marketplace, settings, grocery, recipe books, old migrations, dropped photo-import)"
```

---

### Task 4: Database migrations

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `supabase/migrations/002_seed_food_bank_items.sql`

- [ ] **Step 1: Write `supabase/migrations/001_initial.sql`**

```sql
-- ─── Profiles ──────────────────────────────────────────────────────────────
-- Minimal profile row per auth user. No household/preferences fields — Free
-- Foodie has no household concept. Required by lib/stores/authStore.ts and
-- lib/hooks/useAuth.ts, which are kept unchanged from Simmer Down.

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create a profile row on signup. Written with SET search_path = '' and
-- an exception-swallowing block from the start — CLAUDE.md documents Simmer
-- Down's original version of this trigger silently failing without these,
-- requiring a later fix migration. No reason to reintroduce that bug.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Canonical food bank item catalog ──────────────────────────────────────

CREATE TABLE public.food_bank_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL, -- e.g. 'Canned Goods', 'Dry Goods', 'Produce', 'Dairy', 'Protein', 'Other'
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── User's current pantry ──────────────────────────────────────────────────

CREATE TABLE public.user_pantry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_bank_item_id uuid NOT NULL REFERENCES public.food_bank_items(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, food_bank_item_id)
);

-- ─── Recipes ────────────────────────────────────────────────────────────────

CREATE TABLE public.recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  source_url text,
  image_url text,
  prep_time_minutes int,
  cook_time_minutes int,
  servings int NOT NULL DEFAULT 4,
  skill_level text CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  ingredients jsonb NOT NULL DEFAULT '[]',
  instructions text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Junction: recipes <-> food bank items ─────────────────────────────────

CREATE TABLE public.recipe_food_bank_items (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_bank_item_id uuid NOT NULL REFERENCES public.food_bank_items(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, food_bank_item_id)
);

-- ─── Ratings ────────────────────────────────────────────────────────────────

CREATE TABLE public.recipe_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

-- ─── Recipe import log/cache ────────────────────────────────────────────────
-- Required by the kept supabase/functions/extract-recipe-url, which reads/
-- writes these for its 20-imports-per-day rate limit and per-URL result cache.

CREATE TABLE public.recipe_import_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_import_cache (
  url_hash text PRIMARY KEY,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.food_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_food_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_import_cache ENABLE ROW LEVEL SECURITY;
-- recipe_import_log/cache: no policies — only the edge functions (service-role
-- key, bypasses RLS) touch these tables.

CREATE POLICY "Anyone can read food bank items" ON public.food_bank_items FOR SELECT USING (true);
CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users can insert recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read recipe food bank items" ON public.recipe_food_bank_items FOR SELECT USING (true);
CREATE POLICY "Recipe owner can manage tags" ON public.recipe_food_bank_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users manage own pantry" ON public.user_pantry FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read ratings" ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON public.recipe_ratings FOR ALL USING (auth.uid() = user_id);

-- ─── Storage: recipe-images bucket ──────────────────────────────────────────
-- Required by the kept lib/hooks/useRecipes.ts's useUploadRecipeImage, which
-- uploads to path "<user_id>/<recipe_id or timestamp>.<ext>".

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read recipe images" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Authenticated users can upload recipe images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recipe-images');
CREATE POLICY "Users can update own recipe images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own recipe images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Write `supabase/migrations/002_seed_food_bank_items.sql`**

```sql
INSERT INTO public.food_bank_items (name, category) VALUES
  ('Canned black beans', 'Canned Goods'),
  ('Canned kidney beans', 'Canned Goods'),
  ('Canned chickpeas', 'Canned Goods'),
  ('Canned pinto beans', 'Canned Goods'),
  ('Canned diced tomatoes', 'Canned Goods'),
  ('Canned tomato sauce', 'Canned Goods'),
  ('Canned corn', 'Canned Goods'),
  ('Canned green beans', 'Canned Goods'),
  ('Canned peas', 'Canned Goods'),
  ('Canned mixed vegetables', 'Canned Goods'),
  ('Canned tuna', 'Canned Goods'),
  ('Canned chicken', 'Canned Goods'),
  ('Canned salmon', 'Canned Goods'),
  ('Canned fruit cocktail', 'Canned Goods'),
  ('Canned peaches', 'Canned Goods'),
  ('Canned pineapple', 'Canned Goods'),
  ('Applesauce', 'Canned Goods'),
  ('Canned pumpkin', 'Canned Goods'),
  ('Canned soup', 'Canned Goods'),
  ('Chicken broth', 'Canned Goods'),
  ('Spaghetti sauce', 'Canned Goods'),
  ('Salsa', 'Canned Goods'),
  ('White rice', 'Dry Goods'),
  ('Brown rice', 'Dry Goods'),
  ('Spaghetti', 'Dry Goods'),
  ('Macaroni', 'Dry Goods'),
  ('Egg noodles', 'Dry Goods'),
  ('Instant ramen noodles', 'Dry Goods'),
  ('Rolled oats', 'Dry Goods'),
  ('Cold cereal', 'Dry Goods'),
  ('Dry lentils', 'Dry Goods'),
  ('Dry black beans', 'Dry Goods'),
  ('Dry pinto beans', 'Dry Goods'),
  ('All-purpose flour', 'Dry Goods'),
  ('Cornmeal', 'Dry Goods'),
  ('White sugar', 'Dry Goods'),
  ('Cooking oil', 'Dry Goods'),
  ('Peanut butter', 'Dry Goods'),
  ('Jam or jelly', 'Dry Goods'),
  ('Crackers', 'Dry Goods'),
  ('Mac and cheese', 'Dry Goods'),
  ('Instant mashed potatoes', 'Dry Goods'),
  ('Coffee', 'Dry Goods'),
  ('Tea bags', 'Dry Goods'),
  ('Bottled water', 'Dry Goods'),
  ('Raisins', 'Dry Goods'),
  ('Potatoes', 'Produce'),
  ('Onions', 'Produce'),
  ('Carrots', 'Produce'),
  ('Apples', 'Produce'),
  ('Bananas', 'Produce'),
  ('Powdered milk', 'Dairy'),
  ('Shelf-stable milk', 'Dairy'),
  ('Cheese', 'Dairy'),
  ('Eggs', 'Dairy'),
  ('Ground beef', 'Protein'),
  ('Frozen chicken', 'Protein'),
  ('Bread', 'Other'),
  ('Tortillas', 'Other'),
  ('Mayonnaise', 'Other'),
  ('Mustard', 'Other'),
  ('Ketchup', 'Other')
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 3: Verify**

No live database is connected in this session, so this is a manual review, not an executable test: re-read both files, confirm every `CREATE TABLE`/`CREATE POLICY`/`INSERT` statement is syntactically complete (matching parens, terminating semicolons) and that every table referenced by a foreign key or policy above is defined earlier in the same file. Note in the decisions log that the user needs to run these two files against their new Supabase project (`supabase db push` once linked, or paste into the SQL editor in order — 001 then 002) before the app can do anything real.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/001_initial.sql supabase/migrations/002_seed_food_bank_items.sql
git commit -m "Add Free Foodie database schema and food bank item seed data"
```

---

### Task 5: Rewrite `lib/database.types.ts`

**Files:**
- Modify (full rewrite): `lib/database.types.ts`

- [ ] **Step 1: Replace the entire file contents**

```typescript
export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  /** Optional recipe-section sub-heading, e.g. "For the sauce". Not a grocery-aisle concept. */
  group?: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
        };
      };
      food_bank_items: {
        Row: {
          id: string;
          name: string;
          category: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          image_url?: string | null;
        };
      };
      user_pantry: {
        Row: {
          id: string;
          user_id: string;
          food_bank_item_id: string;
          received_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_bank_item_id: string;
          received_at?: string;
        };
        Update: Record<string, never>;
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          source_url: string | null;
          image_url: string | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          servings: number;
          skill_level: SkillLevel | null;
          ingredients: Ingredient[];
          instructions: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number;
          skill_level?: SkillLevel | null;
          ingredients?: Ingredient[];
          instructions?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number;
          skill_level?: SkillLevel | null;
          ingredients?: Ingredient[];
          instructions?: string[];
          notes?: string | null;
          updated_at?: string;
        };
      };
      recipe_food_bank_items: {
        Row: {
          recipe_id: string;
          food_bank_item_id: string;
        };
        Insert: {
          recipe_id: string;
          food_bank_item_id: string;
        };
        Update: Record<string, never>;
      };
      recipe_ratings: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          rating?: number;
        };
      };
      recipe_import_log: {
        Row: {
          id: string;
          user_id: string;
          url_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url_hash?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      recipe_import_cache: {
        Row: {
          url_hash: string;
          result: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          url_hash: string;
          result: Record<string, unknown>;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
  };
};

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type FoodBankItem = Database['public']['Tables']['food_bank_items']['Row'];
export type UserPantryItem = Database['public']['Tables']['user_pantry']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
export type RecipeFoodBankItem = Database['public']['Tables']['recipe_food_bank_items']['Row'];
export type RecipeRating = Database['public']['Tables']['recipe_ratings']['Row'];
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: errors now concentrated in files that reference the old types (hooks/components not yet rewritten) — that's expected at this point in the plan. Confirm there are no errors reported *inside* `lib/database.types.ts` itself.

- [ ] **Step 3: Commit**
```bash
git add lib/database.types.ts
git commit -m "Rewrite database.types.ts for the Free Foodie schema"
```

---

### Task 6: Add skill-level constants to the theme

**Files:**
- Modify: `lib/theme/index.ts`

- [ ] **Step 1: Append to the end of `lib/theme/index.ts`**

```typescript
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const SKILL_LEVEL_LABELS: Record<typeof SKILL_LEVELS[number], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
```

Leave every existing export in this file untouched — `AISLE_CATEGORIES`, `DEFAULT_CATEGORIES`, `MEAL_TYPES`, `BOOK_PALETTE`, etc. all belonged to deleted features, but `lib/theme/` is on the kickoff's explicit "keep unchanged" list. They become dead exports; deleting them is out of scope for this kickoff (the whole folder is a keep-as-is per the design doc) and removing only some entries risks an inconsistent partial edit to a file this plan wasn't asked to clean up.

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no new errors from this file.

- [ ] **Step 3: Commit**
```bash
git add lib/theme/index.ts
git commit -m "Add SKILL_LEVELS constants for recipe skill-level filtering"
```

---

### Task 7: Fix `lib/api/importRecipe.ts` for the new `Ingredient` type

The new `Ingredient` type (Task 5) has no `aisle_category` field, but `normalizeIngredients` in this kept file sets one on every ingredient it returns, and imports `guessAisleCategory`/`AisleCategory` solely for that. Removing the now-invalid field and its now-unused imports.

**Files:**
- Modify: `lib/api/importRecipe.ts`

- [ ] **Step 1: Edit the top of the file and `normalizeIngredients`**

Remove these two lines from the imports:
```typescript
import { guessAisleCategory } from '../utils/ingredients';
import { AisleCategory } from '../theme';
```

Change `normalizeIngredients` from:
```typescript
function normalizeIngredients(raw: ImportedRecipe['ingredients']): Ingredient[] {
  return raw.map((ing) => ({
    name: ing.name,
    amount: ing.amount ?? '',
    unit: ing.unit ?? '',
    aisle_category: guessAisleCategory(ing.name) as AisleCategory,
  }));
}
```
to:
```typescript
function normalizeIngredients(raw: ImportedRecipe['ingredients']): Ingredient[] {
  return raw.map((ing) => ({
    name: ing.name,
    amount: ing.amount ?? '',
    unit: ing.unit ?? '',
  }));
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in `lib/api/importRecipe.ts`.

- [ ] **Step 3: Commit**
```bash
git add lib/api/importRecipe.ts
git commit -m "Drop aisle_category from importRecipe normalization (no longer part of Ingredient)"
```

---

### Task 8: `lib/hooks/useFoodBankItems.ts` (new)

**Files:**
- Create: `lib/hooks/useFoodBankItems.ts`

- [ ] **Step 1: Write the file**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { FoodBankItem } from '../database.types';
import { useUser } from './useAuth';

/** Full catalog, ordered by category then name — for grouped "browse" lists. */
export function useFoodBankItems() {
  const user = useUser();

  return useQuery({
    queryKey: ['food_bank_items'],
    queryFn: async (): Promise<FoodBankItem[]> => {
      const { data, error } = await supabase
        .from('food_bank_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as FoodBankItem[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // catalog rarely changes — cache for an hour
  });
}

/** Name search against the catalog, for the pantry "add by search" flow. */
export function useFoodBankItemSearch(query: string) {
  const user = useUser();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['food_bank_items', 'search', trimmed],
    queryFn: async (): Promise<FoodBankItem[]> => {
      const { data, error } = await supabase
        .from('food_bank_items')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .order('name', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as FoodBankItem[];
    },
    enabled: !!user && trimmed.length > 0,
  });
}

/** Group a flat item list by category, preserving each category's first-seen order. */
export function groupByCategory(items: FoodBankItem[]): { category: string; items: FoodBankItem[] }[] {
  const groups: { category: string; items: FoodBankItem[] }[] = [];
  for (const item of items) {
    const existing = groups.find((g) => g.category === item.category);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ category: item.category, items: [item] });
    }
  }
  return groups;
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**
```bash
git add lib/hooks/useFoodBankItems.ts
git commit -m "Add useFoodBankItems hook (catalog fetch, search, grouping)"
```

---

### Task 9: `lib/hooks/useUserPantry.ts` (new)

**Files:**
- Create: `lib/hooks/useUserPantry.ts`

- [ ] **Step 1: Write the file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { FoodBankItem } from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';

const PANTRY_KEY = 'user_pantry';

export type PantryItem = {
  id: string;
  food_bank_item_id: string;
  received_at: string;
  food_bank_item: FoodBankItem;
};

export function useUserPantry() {
  const user = useUser();

  return useQuery({
    queryKey: [PANTRY_KEY, user?.id],
    queryFn: async (): Promise<PantryItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_pantry')
        .select('id, food_bank_item_id, received_at, food_bank_item:food_bank_items(*)')
        .order('received_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.id,
        food_bank_item_id: row.food_bank_item_id,
        received_at: row.received_at,
        food_bank_item: row.food_bank_item as FoodBankItem,
      }));
    },
    enabled: !!user,
  });
}

export function useAddPantryItem() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (foodBankItemId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_pantry')
        .upsert(
          { user_id: user.id, food_bank_item_id: foodBankItemId },
          { onConflict: 'user_id,food_bank_item_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PANTRY_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useRemovePantryItem() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (pantryRowId: string) => {
      const { error } = await supabase.from('user_pantry').delete().eq('id', pantryRowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PANTRY_KEY] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**
```bash
git add lib/hooks/useUserPantry.ts
git commit -m "Add useUserPantry hook (list, add, remove)"
```

---

### Task 10: `lib/hooks/useRecipeRatings.ts` (new)

**Files:**
- Create: `lib/hooks/useRecipeRatings.ts`

- [ ] **Step 1: Write the file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';

export type RatingSummary = {
  average: number | null;
  count: number;
  userRating: number | null;
};

export function useRecipeRating(recipeId: string) {
  const user = useUser();

  return useQuery({
    queryKey: ['recipe_ratings', recipeId],
    queryFn: async (): Promise<RatingSummary> => {
      const { data, error } = await supabase
        .from('recipe_ratings')
        .select('rating, user_id')
        .eq('recipe_id', recipeId);
      if (error) throw error;

      const rows = data ?? [];
      const count = rows.length;
      const average = count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : null;
      const userRating = rows.find((r) => r.user_id === user?.id)?.rating ?? null;

      return { average, count, userRating };
    },
    enabled: !!recipeId,
  });
}

export function useSubmitRating() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ recipeId, rating }: { recipeId: string; rating: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('recipe_ratings')
        .upsert(
          { recipe_id: recipeId, user_id: user.id, rating },
          { onConflict: 'recipe_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, { recipeId }) => {
      qc.invalidateQueries({ queryKey: ['recipe_ratings', recipeId] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      showToast('Rating saved', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**
```bash
git add lib/hooks/useRecipeRatings.ts
git commit -m "Add useRecipeRatings hook (average/count/userRating, submit)"
```

---

### Task 11: Rewrite `lib/hooks/useRecipes.ts`

This is the biggest hook rewrite — see design doc §5 for the reasoning. Attaches `foodBankItemIds`, `avgRating`, `ratingCount`, and `submitterName` to each recipe via small batched follow-up queries (not N+1 per row).

**Files:**
- Modify (full rewrite): `lib/hooks/useRecipes.ts`

- [ ] **Step 1: Replace the entire file contents**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Recipe, RecipeInsert, RecipeUpdate, SkillLevel } from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { imageUriToArrayBuffer } from '../utils/webCompat';

export type RecipeWithMeta = Recipe & {
  foodBankItemIds: string[];
  avgRating: number | null;
  ratingCount: number;
  submitterName: string | null;
};

export type RecipeFilters = {
  search?: string;
  skillLevel?: SkillLevel;
  foodBankItemId?: string;
  canMakeNow?: boolean;
  /** Only the current session user's own recipes — used by the Profile tab. */
  mine?: boolean;
};

const RECIPES_KEY = 'recipes';

/** Attaches tag ids, rating summary, and submitter display name to a list of raw recipe rows. */
async function attachMeta(recipes: Recipe[]): Promise<RecipeWithMeta[]> {
  if (recipes.length === 0) return [];
  const ids = recipes.map((r) => r.id);
  const userIds = Array.from(new Set(recipes.map((r) => r.user_id).filter(Boolean))) as string[];

  /** Always resolves to the same shape whether or not there are ids to look up —
   *  keeps this out of the Promise.all tuple below so its type doesn't have to
   *  unify with a real PostgrestResponse via a ternary. */
  async function fetchProfileNames(ids: string[]): Promise<{ user_id: string; display_name: string | null; email: string }[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('profiles').select('user_id, display_name, email').in('user_id', ids);
    if (error) throw error;
    return data;
  }

  const [tagsRes, ratingsRes, profileRows] = await Promise.all([
    supabase.from('recipe_food_bank_items').select('recipe_id, food_bank_item_id').in('recipe_id', ids),
    supabase.from('recipe_ratings').select('recipe_id, rating').in('recipe_id', ids),
    fetchProfileNames(userIds),
  ]);

  if (tagsRes.error) throw tagsRes.error;
  if (ratingsRes.error) throw ratingsRes.error;

  const tagsByRecipe = new Map<string, string[]>();
  for (const row of tagsRes.data ?? []) {
    const list = tagsByRecipe.get(row.recipe_id) ?? [];
    list.push(row.food_bank_item_id);
    tagsByRecipe.set(row.recipe_id, list);
  }

  const ratingsByRecipe = new Map<string, number[]>();
  for (const row of ratingsRes.data ?? []) {
    const list = ratingsByRecipe.get(row.recipe_id) ?? [];
    list.push(row.rating);
    ratingsByRecipe.set(row.recipe_id, list);
  }

  const nameByUser = new Map<string, string>();
  for (const row of profileRows) {
    nameByUser.set(row.user_id, row.display_name || row.email.split('@')[0]);
  }

  return recipes.map((recipe) => {
    const ratings = ratingsByRecipe.get(recipe.id) ?? [];
    return {
      ...recipe,
      foodBankItemIds: tagsByRecipe.get(recipe.id) ?? [],
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      ratingCount: ratings.length,
      submitterName: recipe.user_id ? nameByUser.get(recipe.user_id) ?? null : null,
    };
  });
}

export function useRecipes(filters?: RecipeFilters) {
  const user = useUser();

  return useQuery({
    queryKey: [RECIPES_KEY, user?.id, filters],
    queryFn: async (): Promise<RecipeWithMeta[]> => {
      let query = supabase.from('recipes').select('*').order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters?.skillLevel) {
        query = query.eq('skill_level', filters.skillLevel);
      }
      if (filters?.mine) {
        if (!user) return [];
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      let withMeta = await attachMeta(data as Recipe[]);

      if (filters?.foodBankItemId) {
        withMeta = withMeta.filter((r) => r.foodBankItemIds.includes(filters.foodBankItemId!));
      }

      if (filters?.canMakeNow) {
        if (!user) return [];
        const { data: pantryRows, error: pantryError } = await supabase
          .from('user_pantry')
          .select('food_bank_item_id')
          .eq('user_id', user.id);
        if (pantryError) throw pantryError;
        const pantryIds = new Set((pantryRows ?? []).map((p) => p.food_bank_item_id));
        withMeta = withMeta.filter(
          (r) => r.foodBankItemIds.length > 0 && r.foodBankItemIds.every((id) => pantryIds.has(id))
        );
      }

      return withMeta;
    },
    enabled: !filters?.mine || !!user,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: async (): Promise<RecipeWithMeta> => {
      const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
      if (error) throw error;
      const [withMeta] = await attachMeta([data as Recipe]);
      return withMeta;
    },
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      recipe,
      foodBankItemIds,
    }: {
      recipe: Omit<RecipeInsert, 'user_id'>;
      foodBankItemIds: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recipes')
        .insert({ ...recipe, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      if (foodBankItemIds.length) {
        const { error: tagError } = await supabase
          .from('recipe_food_bank_items')
          .insert(foodBankItemIds.map((food_bank_item_id) => ({ recipe_id: data.id, food_bank_item_id })));
        if (tagError) throw tagError;
      }

      return data as Recipe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe saved!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({
      id,
      recipe,
      foodBankItemIds,
    }: {
      id: string;
      recipe: RecipeUpdate;
      foodBankItemIds: string[];
    }) => {
      const { error } = await supabase.from('recipes').update(recipe).eq('id', id);
      if (error) throw error;

      const { error: delError } = await supabase.from('recipe_food_bank_items').delete().eq('recipe_id', id);
      if (delError) throw delError;

      if (foodBankItemIds.length) {
        const { error: insError } = await supabase
          .from('recipe_food_bank_items')
          .insert(foodBankItemIds.map((food_bank_item_id) => ({ recipe_id: id, food_bank_item_id })));
        if (insError) throw insError;
      }

      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      qc.invalidateQueries({ queryKey: [RECIPES_KEY, id] });
      showToast('Recipe updated', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: recipe } = await supabase.from('recipes').select('image_url').eq('id', id).single();

      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;

      if (recipe?.image_url) {
        try {
          const marker = '/recipe-images/';
          const idx = recipe.image_url.indexOf(marker);
          if (idx !== -1) {
            const storagePath = recipe.image_url.slice(idx + marker.length);
            await supabase.storage.from('recipe-images').remove([storagePath]);
          }
        } catch {
          // Swallow — orphaned image is a minor issue, don't surface to user
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECIPES_KEY] });
      showToast('Recipe deleted', 'info');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useUploadRecipeImage() {
  const user = useUser();

  return useMutation({
    mutationFn: async ({ uri, recipeId }: { uri: string; recipeId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { arrayBuffer, ext } = await imageUriToArrayBuffer(uri);
      const filename = `${user.id}/${recipeId ?? Date.now()}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, arrayBuffer, { contentType, upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('recipe-images').getPublicUrl(data.path);
      return publicUrl;
    },
  });
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in this file (downstream screens/components not yet rewritten will still show errors — expected until Tasks 13–16).

- [ ] **Step 3: Commit**
```bash
git add lib/hooks/useRecipes.ts
git commit -m "Rewrite useRecipes for the Free Foodie schema (tags, ratings, submitter, canMakeNow)"
```

---

### Task 12: `components/recipe/RecipeCard.tsx` (rebuilt) + `components/recipe/FoodBankItemPicker.tsx` (new)

**Files:**
- Create: `components/recipe/RecipeCard.tsx`
- Create: `components/recipe/FoodBankItemPicker.tsx`

- [ ] **Step 1: Write `components/recipe/RecipeCard.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock, ChefHat, Star } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { RecipeWithMeta } from '../../lib/hooks/useRecipes';
import { SKILL_LEVEL_LABELS } from '../../lib/theme';
import { Badge } from '../ui/Badge';

interface RecipeCardProps {
  recipe: RecipeWithMeta;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { colors, typography, layout, shadows } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: recipe.id } })}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: layout.cardRadius, ...shadows.card },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.skeleton }]}>
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.placeholderIcon}>
            <ChefHat color={colors.textSecondary} size={28} strokeWidth={1.5} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <View style={styles.metaRow}>
          {recipe.cook_time_minutes ? (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {recipe.cook_time_minutes} min
              </Text>
            </View>
          ) : null}
          {recipe.avgRating != null ? (
            <View style={styles.metaItem}>
              <Star size={12} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {recipe.avgRating.toFixed(1)} ({recipe.ratingCount})
              </Text>
            </View>
          ) : null}
        </View>

        {recipe.skill_level ? (
          <Badge label={SKILL_LEVEL_LABELS[recipe.skill_level]} variant="outline" style={styles.badge} />
        ) : null}

        {recipe.submitterName ? (
          <Text
            style={[styles.submitter, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}
            numberOfLines={1}
          >
            by {recipe.submitterName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  imageWrap: {
    aspectRatio: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    opacity: 0.5,
  },
  body: {
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  submitter: {
    fontSize: 11,
  },
});
```

- [ ] **Step 2: Write `components/recipe/FoodBankItemPicker.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useFoodBankItems, groupByCategory } from '../../lib/hooks/useFoodBankItems';

interface FoodBankItemPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function FoodBankItemPicker({ selectedIds, onToggle }: FoodBankItemPickerProps) {
  const { colors, typography } = useTheme();
  const { data: items, isLoading } = useFoodBankItems();

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }

  const groups = groupByCategory(items ?? []);

  return (
    <View>
      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text
            style={[
              styles.groupLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold },
            ]}
          >
            {group.category.toUpperCase()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {group.items.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onToggle(item.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? '#fff' : colors.textSecondary,
                          fontFamily: typography.fontFamilies.sansMedium,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  groupLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
```

Note: this component is multi-select only (used for tagging a recipe to food bank items in `RecipeForm`, Task 13). The Recipes tab's "filter by one food bank item" chips (Task 16) render their own simpler flat inline chip list directly from `useFoodBankItems()` rather than reusing this component — that filter list isn't grouped by category the way tagging benefits from, so sharing the component would mean threading an unused grouping concern through a single-select call site for no gain.

- [ ] **Step 3: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in either new file.

- [ ] **Step 4: Commit**
```bash
git add components/recipe/RecipeCard.tsx components/recipe/FoodBankItemPicker.tsx
git commit -m "Add rebuilt RecipeCard and new FoodBankItemPicker components"
```

---

### Task 13: `components/recipe/RecipeForm.tsx` (new, shared create/edit form)

**Files:**
- Create: `components/recipe/RecipeForm.tsx`

- [ ] **Step 1: Write the file**

```typescript
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Minus, Camera, Image as ImageIcon, Download } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useCreateRecipe, useUpdateRecipe, useUploadRecipeImage, RecipeWithMeta } from '../../lib/hooks/useRecipes';
import { importFromUrl } from '../../lib/api/importRecipe';
import { Ingredient, SkillLevel } from '../../lib/database.types';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../lib/theme';
import { FoodBankItemPicker } from './FoodBankItemPicker';

interface FormIngredient extends Ingredient {
  key: string;
}

const EMPTY_INGREDIENT = (): FormIngredient => ({
  key: String(Date.now() + Math.random()),
  name: '',
  amount: '',
  unit: '',
});

interface RecipeFormProps {
  mode: 'create' | 'edit';
  initialRecipe?: RecipeWithMeta;
  onSaved: (recipeId: string) => void;
}

export function RecipeForm({ mode, initialRecipe, onSaved }: RecipeFormProps) {
  const { colors, typography, layout } = useTheme();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const uploadImage = useUploadRecipeImage();

  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [description, setDescription] = useState(initialRecipe?.description ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.source_url ?? '');
  const [imageUri, setImageUri] = useState<string | null>(initialRecipe?.image_url ?? null);
  const [prepTime, setPrepTime] = useState(initialRecipe?.prep_time_minutes?.toString() ?? '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cook_time_minutes?.toString() ?? '');
  const [servings, setServings] = useState(initialRecipe?.servings?.toString() ?? '4');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(initialRecipe?.skill_level ?? null);
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initialRecipe?.ingredients?.length
      ? initialRecipe.ingredients.map((i) => ({ ...i, key: String(Date.now() + Math.random()) }))
      : [EMPTY_INGREDIENT()]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initialRecipe?.instructions?.length ? initialRecipe.instructions : ['']
  );
  const [foodBankItemIds, setFoodBankItemIds] = useState<string[]>(initialRecipe?.foodBankItemIds ?? []);
  const [saving, setSaving] = useState(false);

  const toggleFoodBankItem = (id: string) => {
    setFoodBankItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const imported = await importFromUrl(importUrl.trim());
      setTitle(imported.title);
      setDescription(imported.description ?? '');
      setSourceUrl(importUrl.trim());
      setServings(String(imported.servings ?? 4));
      setPrepTime(imported.prep_time_minutes != null ? String(imported.prep_time_minutes) : '');
      setCookTime(imported.cook_time_minutes != null ? String(imported.cook_time_minutes) : '');
      setIngredients(
        imported.ingredients.length
          ? imported.ingredients.map((i) => ({ ...i, key: String(Date.now() + Math.random()) }))
          : [EMPTY_INGREDIENT()]
      );
      setInstructions(imported.instructions.length ? imported.instructions : ['']);
      if (imported.image_url) setImageUri(imported.image_url);
    } catch (e: any) {
      Alert.alert('Import failed', e.message);
    } finally {
      setImporting(false);
    }
  };

  const pickImage = async () => {
    const useCamera = Platform.OS !== 'web';
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const addIngredient = () => setIngredients((prev) => [...prev, EMPTY_INGREDIENT()]);
  const updateIngredient = (key: string, field: keyof Ingredient, value: string) =>
    setIngredients((prev) => prev.map((ing) => (ing.key === key ? { ...ing, [field]: value } : ing)));
  const removeIngredient = (key: string) => setIngredients((prev) => prev.filter((i) => i.key !== key));

  const addInstruction = () => setInstructions((prev) => [...prev, '']);
  const updateInstruction = (index: number, value: string) =>
    setInstructions((prev) => prev.map((s, i) => (i === index ? value : s)));
  const removeInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }
    setSaving(true);
    try {
      let image_url: string | null | undefined = imageUri ?? undefined;
      const isLocalUri = imageUri && !imageUri.startsWith('http');
      if (isLocalUri) {
        image_url = await uploadImage.mutateAsync({ uri: imageUri!, recipeId: initialRecipe?.id });
      }

      const cleanIngredients: Ingredient[] = ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), amount: i.amount, unit: i.unit, group: i.group }));
      const cleanInstructions = instructions.filter((s) => s.trim());

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        source_url: sourceUrl.trim() || null,
        image_url: image_url ?? null,
        prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime, 10) : null,
        servings: parseInt(servings, 10) || 4,
        skill_level: skillLevel,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      };

      if (mode === 'create') {
        const created = await createRecipe.mutateAsync({ recipe: payload, foodBankItemIds });
        onSaved(created.id);
      } else {
        await updateRecipe.mutateAsync({ id: initialRecipe!.id, recipe: payload, foodBankItemIds });
        onSaved(initialRecipe!.id);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { paddingHorizontal: layout.screenPaddingH, marginTop: 24 },
        sectionTitle: { ...typography.textStyles.headingSmall, color: colors.textPrimary, marginBottom: 8 },
        label: { ...typography.textStyles.labelSmall, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
        input: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: layout.inputRadius,
          paddingHorizontal: 14,
          paddingVertical: 12,
          ...typography.textStyles.bodyMedium,
          color: colors.textPrimary,
        },
        inputMultiline: { height: 80, textAlignVertical: 'top' },
        row: { flexDirection: 'row', gap: 12 },
        flex1: { flex: 1 },
        importRow: { flexDirection: 'row', gap: 8 },
        importBtn: {
          backgroundColor: colors.secondary,
          borderRadius: layout.inputRadius,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        imagePicker: {
          height: 160,
          borderRadius: layout.cardRadius,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          overflow: 'hidden',
        },
        chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
        chipText: { fontSize: 13 },
        ingredientRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
        ingredientAmount: { width: 60 },
        ingredientUnit: { width: 70 },
        ingredientName: { flex: 1 },
        removeButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
        addRowButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
        addRowText: { ...typography.textStyles.labelMedium, color: colors.primary },
        instructionRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
        stepBadge: {
          width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0,
        },
        stepNum: { color: '#fff', fontSize: 13, fontFamily: typography.fontFamilies.sansBold },
        instructionInput: { flex: 1, minHeight: 60, textAlignVertical: 'top' },
        saveBar: {
          padding: layout.screenPaddingH,
          paddingBottom: 32,
        },
        saveButton: {
          backgroundColor: colors.primary,
          borderRadius: layout.buttonRadius,
          paddingVertical: 16,
          alignItems: 'center',
        },
        saveButtonText: { ...typography.textStyles.headingSmall, color: colors.textOnAccent },
      }),
    [colors, typography, layout]
  );

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {mode === 'create' && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import from a URL (optional)</Text>
          <View style={s.importRow}>
            <TextInput
              style={[s.input, s.flex1]}
              value={importUrl}
              onChangeText={setImportUrl}
              placeholder="Paste a recipe URL..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={s.importBtn} onPress={handleImportUrl} disabled={importing}>
              {importing ? <ActivityIndicator color="#fff" size="small" /> : <Download color="#fff" size={18} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Photo</Text>
        <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Camera color={colors.placeholder} size={24} strokeWidth={1.5} />
                <ImageIcon color={colors.placeholder} size={24} strokeWidth={1.5} />
              </View>
              <Text style={{ color: colors.textSecondary }}>Add a photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Basic Info</Text>
        <Text style={s.label}>TITLE *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Recipe title" placeholderTextColor={colors.placeholder} />
        <Text style={s.label}>DESCRIPTION</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="A brief description (optional)"
          placeholderTextColor={colors.placeholder}
          multiline
        />
        <View style={s.row}>
          <View style={s.flex1}>
            <Text style={s.label}>PREP TIME (MIN)</Text>
            <TextInput style={s.input} value={prepTime} onChangeText={setPrepTime} placeholder="15" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
          <View style={s.flex1}>
            <Text style={s.label}>COOK TIME (MIN)</Text>
            <TextInput style={s.input} value={cookTime} onChangeText={setCookTime} placeholder="30" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
          <View style={s.flex1}>
            <Text style={s.label}>SERVINGS</Text>
            <TextInput style={s.input} value={servings} onChangeText={setServings} placeholder="4" placeholderTextColor={colors.placeholder} keyboardType="number-pad" />
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Skill Level</Text>
        <View style={s.chipContainer}>
          {SKILL_LEVELS.map((level) => {
            const active = skillLevel === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setSkillLevel(active ? null : level)}
                style={[s.chip, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}
              >
                <Text style={[s.chipText, { color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  {SKILL_LEVEL_LABELS[level]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Tag Food Bank Items</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
          Which food bank items does this recipe use? This is what "Can make now" filtering matches against.
        </Text>
        <FoodBankItemPicker selectedIds={foodBankItemIds} onToggle={toggleFoodBankItem} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Ingredients</Text>
        {ingredients.map((ing) => (
          <View key={ing.key} style={s.ingredientRow}>
            <TextInput style={[s.input, s.ingredientAmount]} value={ing.amount} onChangeText={(v) => updateIngredient(ing.key, 'amount', v)} placeholder="Amt" placeholderTextColor={colors.placeholder} />
            <TextInput style={[s.input, s.ingredientUnit]} value={ing.unit} onChangeText={(v) => updateIngredient(ing.key, 'unit', v)} placeholder="Unit" placeholderTextColor={colors.placeholder} />
            <TextInput style={[s.input, s.ingredientName]} value={ing.name} onChangeText={(v) => updateIngredient(ing.key, 'name', v)} placeholder="Ingredient name" placeholderTextColor={colors.placeholder} />
            {ingredients.length > 1 && (
              <TouchableOpacity style={s.removeButton} onPress={() => removeIngredient(ing.key)} hitSlop={8}>
                <Minus color={colors.destructive} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addRowButton} onPress={addIngredient}>
          <Plus color={colors.primary} size={16} strokeWidth={2.5} />
          <Text style={s.addRowText}>Add ingredient</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Instructions</Text>
        {instructions.map((step, idx) => (
          <View key={idx} style={s.instructionRow}>
            <View style={s.stepBadge}><Text style={s.stepNum}>{idx + 1}</Text></View>
            <TextInput
              style={[s.input, s.instructionInput]}
              value={step}
              onChangeText={(v) => updateInstruction(idx, v)}
              placeholder={`Step ${idx + 1}...`}
              placeholderTextColor={colors.placeholder}
              multiline
            />
            {instructions.length > 1 && (
              <TouchableOpacity style={s.removeButton} onPress={() => removeInstruction(idx)} hitSlop={8}>
                <Minus color={colors.destructive} size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addRowButton} onPress={addInstruction}>
          <Plus color={colors.primary} size={16} strokeWidth={2.5} />
          <Text style={s.addRowText}>Add step</Text>
        </TouchableOpacity>
      </View>

      <View style={s.saveBar}>
        <TouchableOpacity style={[s.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>{mode === 'create' ? 'Save Recipe' : 'Save Changes'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in this file.

- [ ] **Step 3: Commit**
```bash
git add components/recipe/RecipeForm.tsx
git commit -m "Add shared RecipeForm component (create + edit, URL import, food bank item tagging)"
```

---

### Task 14: `components/pantry/PantryItemRow.tsx` + `components/pantry/AddPantryModal.tsx` (new)

**Files:**
- Create: `components/pantry/PantryItemRow.tsx`
- Create: `components/pantry/AddPantryModal.tsx`

- [ ] **Step 1: Write `components/pantry/PantryItemRow.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { PantryItem } from '../../lib/hooks/useUserPantry';

interface PantryItemRowProps {
  item: PantryItem;
  onRemove: (pantryRowId: string) => void;
}

export function PantryItemRow({ item, onRemove }: PantryItemRowProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansMedium }]}>
        {item.food_bank_item.name}
      </Text>
      <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={8}>
        <X color={colors.textSecondary} size={18} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontSize: 15,
  },
});
```

- [ ] **Step 2: Write `components/pantry/AddPantryModal.tsx`**

Three modes in one bottom-sheet modal: Search, Browse (grouped catalog), Scan (camera + Claude reconciliation). Scan calls the `identify-food-items` edge function built in Task 17 — this task writes the calling code now; it simply won't get a real response until that edge function exists and the user has an `ANTHROPIC_API_KEY` set on their Supabase project (both true after Task 17 + the user's own setup).

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Search, Grid3x3, Camera as CameraIcon, X } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useFoodBankItems, useFoodBankItemSearch, groupByCategory } from '../../lib/hooks/useFoodBankItems';
import { useAddPantryItem } from '../../lib/hooks/useUserPantry';
import { FoodBankItem } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { imageUriToBase64 } from '../../lib/utils/webCompat';

type Mode = 'search' | 'browse' | 'scan';

interface AddPantryModalProps {
  visible: boolean;
  onClose: () => void;
}

async function identifyFoodItems(base64: string): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(`${supabaseUrl}/functions/v1/identify-food-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ image_base64: base64 }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Scan failed');
  return data.items as string[];
}

/** Best catalog match for a free-text detected name, or null if nothing close enough. */
function bestMatch(detectedName: string, catalog: FoodBankItem[]): FoodBankItem | null {
  const needle = detectedName.trim().toLowerCase();
  const exact = catalog.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = catalog.find(
    (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
  );
  return partial ?? null;
}

export function AddPantryModal({ visible, onClose }: AddPantryModalProps) {
  const { colors, typography } = useTheme();
  const [mode, setMode] = useState<Mode>('search');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMatches, setScanMatches] = useState<FoodBankItem[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  const addItem = useAddPantryItem();
  const { data: allItems } = useFoodBankItems();
  const { data: searchResults } = useFoodBankItemSearch(search);

  const handleAdd = (id: string) => {
    addItem.mutate(id);
  };

  const resetScan = () => {
    setScanMatches([]);
    setConfirmedIds([]);
  };

  const handleScan = async () => {
    const result = Platform.OS === 'web'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;

    setScanning(true);
    resetScan();
    try {
      const base64 = await imageUriToBase64(result.assets[0].uri);
      const detectedNames = await identifyFoodItems(base64);
      const catalog = allItems ?? [];
      const matches = detectedNames
        .map((name) => bestMatch(name, catalog))
        .filter((m): m is FoodBankItem => m !== null);
      // De-dupe by id in case two detected names map to the same catalog item
      const unique = Array.from(new Map(matches.map((m) => [m.id, m])).values());
      setScanMatches(unique);
    } catch (e: any) {
      Alert.alert('Scan failed', e.message);
    } finally {
      setScanning(false);
    }
  };

  const toggleScanMatch = (id: string) => {
    setConfirmedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addConfirmedScanItems = () => {
    confirmedIds.forEach((id) => addItem.mutate(id));
    resetScan();
    onClose();
  };

  const groups = groupByCategory(allItems ?? []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Add to Pantry
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <X color={colors.textPrimary} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['search', 'browse', 'scan'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tab, { borderBottomColor: mode === m ? colors.primary : 'transparent' }]}
            >
              {m === 'search' && <Search size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              {m === 'browse' && <Grid3x3 size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              {m === 'scan' && <CameraIcon size={16} color={mode === m ? colors.primary : colors.textSecondary} strokeWidth={2} />}
              <Text style={{ color: mode === m ? colors.primary : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'search' && (
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              placeholder="Search food bank items..."
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <ScrollView style={{ marginTop: 12 }}>
              {(searchResults ?? []).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultRow, { borderColor: colors.border }]}
                  onPress={() => handleAdd(item.id)}
                >
                  <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {mode === 'browse' && (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {groups.map((group) => (
              <View key={group.category} style={{ marginBottom: 16 }}>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.category.toUpperCase()}</Text>
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.resultRow, { borderColor: colors.border }]}
                    onPress={() => handleAdd(item.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {mode === 'scan' && (
          <View style={{ flex: 1, padding: 16 }}>
            {scanMatches.length === 0 ? (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                  Take a photo of the food items you received, and we'll try to match them to the catalog.
                </Text>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: colors.primary }]}
                  onPress={handleScan}
                  disabled={scanning}
                >
                  {scanning ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }}>Take Photo</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  Tap the items you'd like to add to your pantry:
                </Text>
                <ScrollView style={{ flex: 1 }}>
                  {scanMatches.map((item) => {
                    const active = confirmedIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.resultRow,
                          { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '15' : 'transparent' },
                        ]}
                        onPress={() => toggleScanMatch(item.id)}
                      >
                        <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: confirmedIds.length ? colors.primary : colors.border, marginTop: 12 }]}
                  onPress={addConfirmedScanItems}
                  disabled={!confirmedIds.length}
                >
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }}>
                    Add {confirmedIds.length || ''} to Pantry
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={resetScan}>
                  <Text style={{ color: colors.primary }}>Scan again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 24 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0001' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, borderBottomWidth: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  resultRow: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  groupLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 8 },
  scanButton: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
});
```

- [ ] **Step 3: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in either new file.

- [ ] **Step 4: Commit**
```bash
git add components/pantry/PantryItemRow.tsx components/pantry/AddPantryModal.tsx
git commit -m "Add pantry components: item row, add modal (search/browse/scan)"
```

---

### Task 15: Tab layout + Pantry screen

**Files:**
- Modify (full rewrite): `app/(tabs)/_layout.tsx`
- Modify (full rewrite): `app/(tabs)/index.tsx`

- [ ] **Step 1: Rewrite `app/(tabs)/_layout.tsx`**

```typescript
import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform, Text } from 'react-native';
import { lightColors, darkColors } from '../../lib/theme/colors';
import { fontFamilies } from '../../lib/theme/typography';
import { shadows } from '../../lib/theme/spacing';
import { ShoppingBasket, BookOpen, PlusCircle, User } from 'lucide-react-native';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 0
            : Platform.OS === 'web' ? ('max(18px, env(safe-area-inset-bottom))' as any)
            : 8,
          height: Platform.OS === 'ios' ? 84
            : Platform.OS === 'web' ? ('calc(60px + max(18px, env(safe-area-inset-bottom)))' as any)
            : 64,
          ...shadows.tabBar,
        },
        tabBarLabel: ({ color, children }) => (
          <Text
            style={{
              color,
              fontFamily: fontFamilies.sansMedium,
              fontSize: 11,
              lineHeight: 14,
              marginTop: 2,
              paddingBottom: 3,
            }}
          >
            {children as string}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color }) => <ShoppingBasket color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <BookOpen color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={20} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Rewrite `app/(tabs)/index.tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '../../lib/hooks/useTheme';
import { useUserPantry, useRemovePantryItem, PantryItem } from '../../lib/hooks/useUserPantry';
import { PantryItemRow } from '../../components/pantry/PantryItemRow';
import { AddPantryModal } from '../../components/pantry/AddPantryModal';
import { EmptyState } from '../../components/ui/EmptyState';

function groupByCategory(items: PantryItem[]): { category: string; items: PantryItem[] }[] {
  const groups: { category: string; items: PantryItem[] }[] = [];
  for (const item of items) {
    const category = item.food_bank_item.category;
    const existing = groups.find((g) => g.category === category);
    if (existing) existing.items.push(item);
    else groups.push({ category, items: [item] });
  }
  return groups;
}

type Row = { type: 'header'; category: string } | { type: 'item'; item: PantryItem };

export default function PantryScreen() {
  const { colors, typography, layout } = useTheme();
  const { data: pantryItems, isLoading, refetch, isRefetching } = useUserPantry();
  const removeItem = useRemovePantryItem();
  const [showAddModal, setShowAddModal] = useState(false);

  const groups = groupByCategory(pantryItems ?? []);
  const rows: Row[] = groups.flatMap((g) => [
    { type: 'header' as const, category: g.category },
    ...g.items.map((item) => ({ type: 'item' as const, item })),
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          My Pantry
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus color="#fff" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => (row.type === 'header' ? `h-${row.category}` : row.item.id)}
          contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: row }) =>
            row.type === 'header' ? (
              <Text style={[styles.groupLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                {row.category.toUpperCase()}
              </Text>
            ) : (
              <PantryItemRow item={row.item} onRemove={(id) => removeItem.mutate(id)} />
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon={<ShoppingBasket size={48} color={colors.textSecondary} strokeWidth={1.5} />}
              title="Your pantry is empty"
              subtitle="Add items you've received from the food bank to see recipes you can make."
              actionLabel="Add Items"
              onAction={() => setShowAddModal(true)}
            />
          }
        />
      )}

      <AddPantryModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: 30, lineHeight: 36 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { fontSize: 11, letterSpacing: 1.5, marginTop: 16, marginBottom: 6 },
});
```

- [ ] **Step 3: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors from these two files (errors remain in not-yet-rewritten `app/(tabs)/recipes/*`, `submit/`, `profile/` — expected until Tasks 16–17).

- [ ] **Step 4: Commit**
```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/index.tsx"
git commit -m "Add 4-tab layout and Pantry screen"
```

---

### Task 16: Recipes tab screens

**Files:**
- Modify (full rewrite): `app/(tabs)/recipes/_layout.tsx` (no change needed — verify only, see Step 1)
- Modify (full rewrite): `app/(tabs)/recipes/index.tsx`
- Modify (full rewrite): `app/(tabs)/recipes/[id].tsx`
- Create: `app/(tabs)/recipes/edit/[id].tsx`

- [ ] **Step 1: Confirm `app/(tabs)/recipes/_layout.tsx` needs no change**

This file only imports `expo-router`'s `Stack` and the theme's color objects — no Simmer Down-specific types or data. Leave it exactly as-is (already read during design; reproduced here for reference, no edit needed):
```typescript
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../../../lib/theme/colors';

export default function RecipesLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
```

- [ ] **Step 2: Rewrite `app/(tabs)/recipes/index.tsx`**

```typescript
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, X, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipes, RecipeFilters, RecipeWithMeta } from '../../../lib/hooks/useRecipes';
import { RecipeCard } from '../../../components/recipe/RecipeCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../../lib/theme';
import { useFoodBankItems } from '../../../lib/hooks/useFoodBankItems';
import { SkillLevel } from '../../../lib/database.types';

export default function RecipesScreen() {
  const { colors, typography, layout } = useTheme();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [canMakeNow, setCanMakeNow] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | undefined>(undefined);
  const [foodBankItemId, setFoodBankItemId] = useState<string | undefined>(undefined);

  const { data: foodBankItems } = useFoodBankItems();

  const filters: RecipeFilters = {
    search: search || undefined,
    canMakeNow: canMakeNow || undefined,
    skillLevel,
    foodBankItemId,
  };

  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes(filters);

  const hasActiveFilters = canMakeNow || !!skillLevel || !!foodBankItemId;
  const clearFilters = () => {
    setCanMakeNow(false);
    setSkillLevel(undefined);
    setFoodBankItemId(undefined);
  };

  const renderRecipe = useCallback(({ item, index }: { item: RecipeWithMeta; index: number }) => (
    <View style={[styles.cardWrapper, { marginRight: index % 2 === 0 ? 12 : 0 }]}>
      <RecipeCard recipe={item} />
    </View>
  ), []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            Recipes
          </Text>
        </View>

        <View style={[styles.searchRow, { paddingHorizontal: layout.screenPaddingH }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Search color={colors.placeholder} size={18} strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search recipes..."
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <X color={colors.placeholder} size={16} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterButton,
              { backgroundColor: hasActiveFilters ? colors.primary : colors.surface, borderColor: hasActiveFilters ? colors.primary : colors.border },
            ]}
          >
            <SlidersHorizontal color={hasActiveFilters ? '#fff' : colors.textSecondary} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setCanMakeNow(!canMakeNow)}
              style={[styles.chip, { backgroundColor: canMakeNow ? colors.primary : colors.background, borderColor: canMakeNow ? colors.primary : colors.border }]}
            >
              <Text style={{ color: canMakeNow ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                Can make now
              </Text>
            </TouchableOpacity>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>SKILL LEVEL</Text>
            <View style={styles.chipRow}>
              {SKILL_LEVELS.map((level) => {
                const active = skillLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSkillLevel(active ? undefined : level)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>
                      {SKILL_LEVEL_LABELS[level]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>FOOD BANK ITEM</Text>
            <View style={styles.chipRow}>
              {(foodBankItems ?? []).slice(0, 12).map((fbi) => {
                const active = foodBankItemId === fbi.id;
                return (
                  <TouchableOpacity
                    key={fbi.id}
                    onPress={() => setFoodBankItemId(active ? undefined : fbi.id)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }}>{fbi.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontFamily: typography.fontFamilies.sansMedium }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          data={recipes ?? []}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingHorizontal: layout.screenPaddingH }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon={<BookOpen size={48} color={colors.textSecondary} strokeWidth={1.5} />}
                title="No recipes yet"
                subtitle="Be the first to submit a recipe from the Submit tab."
              />
            ) : null
          }
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 30, lineHeight: 36 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filtersPanel: { borderBottomWidth: 1, paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20, gap: 8 },
  filterLabel: { fontSize: 11, letterSpacing: 1.5, marginTop: 12, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  grid: { paddingBottom: 100, paddingTop: 4 },
  cardWrapper: { flex: 1, marginBottom: 12 },
});
```

- [ ] **Step 3: Rewrite `app/(tabs)/recipes/[id].tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit3, Trash2, Clock, ChefHat } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipe, useDeleteRecipe } from '../../../lib/hooks/useRecipes';
import { useRecipeRating, useSubmitRating } from '../../../lib/hooks/useRecipeRatings';
import { useUser } from '../../../lib/hooks/useAuth';
import { ServingsAdjuster } from '../../../components/recipe/ServingsAdjuster';
import { IngredientRow, IngredientGroupHeader } from '../../../components/recipe/IngredientRow';
import { InstructionStep } from '../../../components/recipe/InstructionStep';
import { StarRating } from '../../../components/ui/StarRating';
import { Badge } from '../../../components/ui/Badge';
import { SKILL_LEVEL_LABELS } from '../../../lib/theme';
import { Ingredient } from '../../../lib/database.types';

const HERO_HEIGHT = 240;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const user = useUser();

  const { data: recipe, isLoading } = useRecipe(id);
  const { data: ratingSummary } = useRecipeRating(id);
  const submitRating = useSubmitRating();
  const deleteRecipe = useDeleteRecipe();

  const [servings, setServings] = useState<number | null>(null);

  if (isLoading || !recipe) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentServings = servings ?? recipe.servings;
  const multiplier = currentServings / recipe.servings;
  const isOwner = user?.id === recipe.user_id;

  const groupedIngredients: { group: string | null; items: Ingredient[] }[] = [];
  for (const ing of recipe.ingredients) {
    const group = ing.group ?? null;
    const existing = groupedIngredients.find((g) => g.group === group);
    if (existing) existing.items.push(ing);
    else groupedIngredients.push({ group, items: [ing] });
  }

  const handleDelete = () => {
    Alert.alert('Delete Recipe', `Are you sure you want to delete "${recipe.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe.mutate(recipe.id, { onSuccess: () => router.back() }) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.skeleton }]}>
          {recipe.image_url ? (
            <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <ChefHat color={colors.textSecondary} size={48} strokeWidth={1.5} />
            </View>
          )}
          <SafeAreaView style={styles.heroButtons} edges={['top']}>
            <TouchableOpacity onPress={() => router.back()} style={styles.heroButton} hitSlop={8}>
              <ArrowLeft color="#fff" size={22} strokeWidth={2} />
            </TouchableOpacity>
            {isOwner && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/recipes/edit/[id]', params: { id: recipe.id } })} style={styles.heroButton} hitSlop={8}>
                  <Edit3 color="#fff" size={20} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={styles.heroButton} hitSlop={8}>
                  <Trash2 color="#fff" size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>

        <View style={[styles.content, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            {recipe.title}
          </Text>
          {recipe.submitterName && (
            <Text style={[styles.submitter, { color: colors.textSecondary }]}>by {recipe.submitterName}</Text>
          )}

          <View style={styles.badgeRow}>
            {recipe.skill_level && <Badge label={SKILL_LEVEL_LABELS[recipe.skill_level]} variant="outline" />}
            {recipe.cook_time_minutes ? (
              <View style={styles.metaItem}>
                <Clock size={13} color={colors.textSecondary} strokeWidth={2} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{recipe.cook_time_minutes} min</Text>
              </View>
            ) : null}
          </View>

          {recipe.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{recipe.description}</Text>
          ) : null}

          <View style={styles.ratingSection}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {ratingSummary?.average != null
                  ? `${ratingSummary.average.toFixed(1)} · ${ratingSummary.count} rating${ratingSummary.count === 1 ? '' : 's'}`
                  : 'No ratings yet'}
              </Text>
              <StarRating value={ratingSummary?.average ?? null} readonly size={16} />
            </View>
            {user && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Your rating</Text>
                <StarRating
                  value={ratingSummary?.userRating ?? null}
                  onChange={(rating) => submitRating.mutate({ recipeId: recipe.id, rating })}
                  size={20}
                />
              </View>
            )}
          </View>

          <View style={styles.servingsRow}>
            <ServingsAdjuster baseServings={recipe.servings} currentServings={currentServings} onChange={setServings} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
            Ingredients
          </Text>
          {groupedIngredients.map((group, idx) => (
            <View key={idx}>
              {group.group && <IngredientGroupHeader label={group.group} />}
              {group.items.map((ing, i) => (
                <IngredientRow key={i} ingredient={ing} servingsMultiplier={multiplier} showGroup={false} />
              ))}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold, marginTop: 24 }]}>
            Instructions
          </Text>
          {recipe.instructions.map((step, idx) => (
            <InstructionStep key={idx} step={step} index={idx} total={recipe.instructions.length} />
          ))}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: HERO_HEIGHT },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroButtons: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 20 },
  title: { fontSize: 28, lineHeight: 34 },
  submitter: { fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  ratingSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 },
  servingsRow: { marginTop: 20 },
  sectionTitle: { fontSize: 19, marginTop: 24, marginBottom: 4 },
});
```

- [ ] **Step 4: Write `app/(tabs)/recipes/edit/[id].tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../../../lib/hooks/useTheme';
import { useRecipe } from '../../../../lib/hooks/useRecipes';
import { RecipeForm } from '../../../../components/recipe/RecipeForm';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const { data: recipe, isLoading } = useRecipe(id);

  if (isLoading || !recipe) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
          Edit Recipe
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <RecipeForm
        mode="edit"
        initialRecipe={recipe}
        onSaved={() => router.replace({ pathname: '/(tabs)/recipes/[id]', params: { id: recipe.id } })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17 },
});
```

- [ ] **Step 5: Verify**
```bash
npx tsc --noEmit
```
Expected: no errors in `app/(tabs)/recipes/**`. Errors may remain in `submit/` and `profile/` (Task 17).

- [ ] **Step 6: Commit**
```bash
git add "app/(tabs)/recipes"
git commit -m "Rewrite Recipes tab: browse/filter list, detail with ratings, edit screen"
```

---

### Task 17: Submit tab, Profile tab, and the `identify-food-items` edge function

**Files:**
- Create: `app/(tabs)/submit/index.tsx`
- Create: `app/(tabs)/profile/index.tsx`
- Create: `supabase/functions/identify-food-items/index.ts`

- [ ] **Step 1: Write `app/(tabs)/submit/index.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../../lib/hooks/useTheme';
import { RecipeForm } from '../../../components/recipe/RecipeForm';

export default function SubmitScreen() {
  const { colors, typography, layout } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Submit a Recipe
        </Text>
      </View>
      <RecipeForm
        mode="create"
        onSaved={(recipeId) => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: recipeId } })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, lineHeight: 34 },
});
```

- [ ] **Step 2: Write `app/(tabs)/profile/index.tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, ChevronRight, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useProfile } from '../../../lib/hooks/useAuth';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useRecipes, RecipeWithMeta } from '../../../lib/hooks/useRecipes';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ProfileScreen() {
  const { colors, typography, layout } = useTheme();
  const profile = useProfile();
  const { updateProfile, signOut } = useAuthStore();
  const { data: myRecipes, isLoading } = useRecipes({ mine: true });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: nameInput.trim() || null });
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const renderRecipe = ({ item }: { item: RecipeWithMeta }) => (
    <TouchableOpacity
      style={[styles.recipeRow, { borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/(tabs)/recipes/[id]', params: { id: item.id } })}
    >
      <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={1}>{item.title}</Text>
      <ChevronRight size={16} color={colors.border} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Profile
        </Text>
      </View>

      <View style={[styles.section, { paddingHorizontal: layout.screenPaddingH }]}>
        {editingName ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Display name"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveName} disabled={saving} style={[styles.saveNameBtn, { backgroundColor: colors.primary }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff' }}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: typography.fontFamilies.sansSemiBold }}>
              {profile?.display_name || 'Add your name'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{profile?.email}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: layout.screenPaddingH }]}>
        MY RECIPES
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={myRecipes ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, paddingBottom: 20 }}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpen size={40} color={colors.textSecondary} strokeWidth={1.5} />}
              title="No recipes yet"
              subtitle="Recipes you submit will show up here."
            />
          }
        />
      )}

      <TouchableOpacity onPress={handleSignOut} style={[styles.signOutRow, { paddingHorizontal: layout.screenPaddingH }]}>
        <LogOut size={18} color={colors.destructive} strokeWidth={2} />
        <Text style={{ color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium }}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, lineHeight: 34 },
  section: { paddingVertical: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  saveNameBtn: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, marginTop: 'auto' },
});
```

- [ ] **Step 3: Write `supabase/functions/identify-food-items/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Look at this photo of food items from a food bank. List only the distinct food items you can identify. Return a JSON array of strings, each being a common food item name.

Output ONLY valid JSON (no markdown, no extra text) in this exact shape:
["item name", "item name"]

If you cannot identify any food items in the image, output an empty array: []`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${authError?.message ?? 'no user'}` }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { image_base64, media_type = 'image/jpeg' } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
              { type: 'text', text: 'List the distinct food items in this photo. Output only the JSON array.' },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const items = JSON.parse(cleaned);

    return new Response(JSON.stringify({ items }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('identify-food-items error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 4: Verify**
```bash
npx tsc --noEmit
```
Expected: **zero errors, repo-wide.** This is the first point in the plan where the whole project should type-check cleanly — every file that referenced deleted types/modules has now been replaced. If errors remain, read each one and fix it before moving to Task 18 (likely causes: a stray import path, a leftover reference to a deleted hook/component, or a typo in a prop name — cross-check against the exact signatures defined in Tasks 8–14).

- [ ] **Step 5: Commit**
```bash
git add "app/(tabs)/submit" "app/(tabs)/profile" supabase/functions/identify-food-items
git commit -m "Add Submit tab, Profile tab, and identify-food-items edge function"
```

---

### Task 18: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**
```bash
npx tsc --noEmit
```
Expected: zero errors (confirmed already at end of Task 17, re-confirming after any fixes).

- [ ] **Step 2: Confirm no leftover references to deleted modules**
```bash
git grep -l "useMealPlan\|useMarketplace\|useGroceryList\|useHousehold\|useRecipeBooks\|weekRulesStore\|groceryCategoryStore\|preferencesStore\|AddRecipeModal\|AddToBookModal\|extract-recipe-image" -- '*.ts' '*.tsx'
```
Expected: no output. If anything matches, it's a file this plan missed — read it and either delete it (if it's dead) or fix the reference.

- [ ] **Step 3: Start the app in the browser preview and smoke-test**

Use the project's dev server (this session's Browser tool, not a plain terminal) to confirm the app actually renders: start `npx expo start --web`, open it, and check:
- The app loads to the login screen without a red-screen error (confirms `app/_layout.tsx`, theme, fonts all still wire up).
- Login/signup screens show "Free Foodie" branding, not "Simmer Down".
- Note in the decisions log that full functional testing (adding pantry items, submitting a recipe, rating) requires a real Supabase project with the migrations applied — which doesn't exist yet — so this smoke test is necessarily limited to "does it render without crashing," not "does data flow work end-to-end." Flag this clearly for the user's morning review rather than claiming more than was actually verified.

- [ ] **Step 4: Update the decisions log with a final implementation-phase summary**

Append to `docs/superpowers/specs/2026-09-05-free-foodie-decisions-log.md` under "Implementation-phase decisions": which files ended up needing adjustment beyond the plan (if any, from Step 2's grep or Step 3's smoke test), and the exact commands the user needs to run before the app is functional (create Supabase project, run the two migration files, set real `.env` values, set `ANTHROPIC_API_KEY` in Supabase edge function secrets, run `eas init`).

- [ ] **Step 5: Final commit**
```bash
git add docs/superpowers/specs/2026-09-05-free-foodie-decisions-log.md
git commit -m "Free Foodie kickoff: implementation complete, pending user Supabase/EAS setup"
```

- [ ] **Step 6: Push the branch (do not merge to master)**
```bash
git push -u origin free-foodie-kickoff
```
Leave it there for the user's morning review — do not merge to `master` without their approval.
