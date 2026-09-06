# Free Foodie Kickoff Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

> **Status note (2026-09-05):** This spec was approved by the user, who then went to bed and asked for autonomous execution ("keep moving forward without any input from me, making the recommended choice at each step"). Every judgment call made without a live human decision is marked ⚠️ and also logged in `docs/superpowers/specs/2026-09-05-free-foodie-decisions-log.md` for morning review. Nothing here should be treated as unchangeable — flag anything that looks wrong.

**Goal:** Strip the forked Simmer Down (personal meal-planning) codebase down to its reusable foundation (auth, theme, UI kit, recipe CRUD skeleton, URL-import) and build Free Foodie on top of it: a community recipe app for food bank visitors. Users log food items they received into a pantry, browse/submit recipes tagged to canonical food bank items, rate recipes, and filter to "what can I make right now with what I have."

**Architecture:** Same stack as Simmer Down (Expo SDK 52 + Router, Supabase Postgres/Auth/Storage/Edge Functions, TanStack Query, Zustand, Lucide icons, DM Serif/DM Sans/JetBrains Mono). Brand-new, much simpler Supabase schema (no households, no meal plans, no grocery lists). Four-tab app: Pantry, Recipes, Submit, Profile.

**Tech Stack:** Unchanged from Simmer Down per project instructions — do not introduce new libraries beyond what's already in `package.json` unless a specific feature genuinely requires it (e.g. `expo-image-picker`, already installed, covers the pantry photo-scan camera flow).

---

## 1. Rebrand & Config

- `app.config.ts`: `name` → `"Free Foodie"` (dev/preview variant strings follow the existing `(Dev)`/`(Preview)` suffix pattern), `slug` → `free-foodie`, `scheme` → `freefoodie`, iOS `bundleIdentifier` / Android `package` → `com.freefoodie.app` (`.dev` / `.preview` suffixes kept for those variants), all `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` / `expo-camera` / `expo-image-picker` permission strings reworded to describe Free Foodie's photo/scan use, `expo-secure-store` Face ID string reworded.
- ⚠️ App icon/splash image assets (`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png`) are left as-is (still Simmer Down artwork). Rebranding visual assets is a separate design task, out of scope for this kickoff — flagged so it isn't mistaken for an oversight.
- `package.json`: `name` → `free-foodie`.
- `.env` and `.env.example`: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` set to placeholder values (`YOUR_PROJECT_REF`, `YOUR_ANON_KEY`) — a real Supabase project doesn't exist yet, so these must be filled in by the user later.
- ⚠️ `app/_layout.tsx`: AsyncStorage persister `key` changes from `simmerdown-query-cache-v1` to `freefoodie-query-cache-v1`, so a device that previously ran Simmer Down never resurrects its cached queries under the new app.
- `eas.json`: structure unchanged (build profiles are app-agnostic). ⚠️ The `extra.eas.projectId` in `app.config.ts` is left as a placeholder with a comment — a new EAS project must be created via `eas init` under the user's account; this can't be done non-interactively.
- Any remaining "Simmer Down" copy strings found in `(auth)` screens, alerts, or headers get reworded during implementation (tracked as a checklist item, not enumerated here since it's mechanical find-and-replace).

## 2. Deletions

Everything the kickoff prompt listed, plus three items found during repo exploration that were missed but clearly belong in the same category (leftover Simmer Down features with no home in the new tab structure):

**Screens:** `app/(tabs)/plan/`, `app/(tabs)/marketplace/`, `app/(tabs)/settings/`, and ⚠️ `app/(tabs)/grocery/` (not in the original list, but it's the meal-plan-derived grocery list screen — no equivalent concept in Free Foodie).

**Components:** `components/meal-plan/` (entire folder), `components/recipe/AddToBookModal.tsx`, `components/recipe/RecipeCard.tsx`, and ⚠️ `components/recipe/AddRecipeModal.tsx` (the "Add a Recipe" action-sheet that routes to scratch/photo/URL entry — being replaced by a simpler Submit-tab flow, see §6).

**Hooks:** `lib/hooks/useMealPlan.ts`, `useMarketplace.ts`, `useGroceryList.ts`, `useHousehold.ts`, `useHouseholdSync.ts`, `useRecipeBooks.ts`.

**Stores:** `lib/stores/weekRulesStore.ts`, `groceryCategoryStore.ts`, `preferencesStore.ts`.

**Utils:** `lib/utils/groceryAggregation.ts`, `exportRecipes.ts`.

**Edge Functions:** ⚠️ `supabase/functions/extract-recipe-image/` (the recipe-card photo-scan feature — distinct from the new pantry photo-scan in §7; dropped for this kickoff per explicit decision, see Decisions Log).

**Screens (recipe photo-import path):** ⚠️ `app/(tabs)/recipes/import.tsx`, `app/(tabs)/recipes/import-review.tsx` (the photo half of this pair; the URL-import half of the underlying logic is preserved via `lib/api/importRecipe.ts`, reused directly in the new Submit flow rather than through this route).

**Migrations:** all of `supabase/migrations/*.sql` — this includes migrations `001` through `025` (the repo has more migrations than CLAUDE.md's slightly stale "001–012" description suggests; all are deleted regardless of number, since this is a fresh Supabase project with a fresh schema).

## 3. Kept Files

As specified in the kickoff prompt, unchanged:
`app/_layout.tsx` (except the persister key, §1), `app/(auth)/*` (except copy strings), `lib/supabase.ts`, `lib/hooks/useAuth.ts`, `lib/hooks/useTheme.ts`, `lib/stores/authStore.ts`, `lib/stores/uiStore.ts`, `lib/theme/*`, `lib/utils/dates.ts`, `fractions.ts`, `ingredients.ts`, `webCompat.ts`, `lib/api/importRecipe.ts`, `components/ui/*`, `components/recipe/IngredientRow.tsx`, `InstructionStep.tsx`, `ServingsAdjuster.tsx`, `supabase/functions/extract-recipe-url/`.

⚠️ **Correction to the kickoff's characterization of `lib/hooks/useRecipes.ts`:** the kickoff said to "extend" this file, but the new `recipes` table schema (§4) drops `household_id`, `is_default`, `categories`, `tags`, `is_favorite`, `rating`, `season_tags`, `meal_type`, and `total_time_minutes` — none of which exist in the Free Foodie schema (rating moves to a separate `recipe_ratings` table; the rest have no Free Foodie equivalent). This file will be substantially rewritten against the new schema rather than incrementally extended. Kept unchanged: `useUploadRecipeImage` (storage path convention `<user_id>/<recipe_id or timestamp>.<ext>` is schema-agnostic) and the general shape (TanStack Query hooks, optimistic patterns, toast-on-error). See §5 for the new hook surface.

## 4. Database Schema

### 4.1 `supabase/migrations/001_initial.sql`

The five tables exactly as specified in the kickoff prompt (`food_bank_items`, `user_pantry`, `recipes`, `recipe_food_bank_items`, `recipe_ratings`) with their RLS policies verbatim, **plus** three additions required to make the "kept" files in §3 actually function against a fresh database:

**`profiles`** — ⚠️ not in the kickoff's schema at all, but `authStore.ts` and `useAuth.ts` (both explicitly kept unchanged) read/write a `profiles` table with `user_id`, `email`, `display_name`. Without it, `refreshProfile()` fails on every login. Kept intentionally minimal — no `household_id`, no `preferences` JSONB — since Free Foodie has no household concept:

```sql
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
```

Public SELECT is deliberate: recipe cards need to show "submitted by \<name\>" for any user, not just the viewer.

A `handle_new_user` trigger creates the profile row on signup. CLAUDE.md documents that Simmer Down's original version of this trigger (migration 001) silently failed because it lacked `SET search_path = ''` inside a `SECURITY DEFINER` function, and had to be patched later in migration 012. Writing it correctly from the start:

```sql
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
```

`authStore.ts`'s existing `PGRST116` (no rows) fallback in `refreshProfile()` still serves as a second safety net if the trigger is ever missed.

**`recipe_import_log`** / **`recipe_import_cache`** — ⚠️ required by the kept `extract-recipe-url` edge function, which reads/writes these two tables for its 20-imports-per-day rate limit and per-URL result cache. Not in the kickoff's schema; added here so the kept function doesn't throw on every call:

```sql
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

ALTER TABLE public.recipe_import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_import_cache ENABLE ROW LEVEL SECURITY;
-- No policies: only the edge function (service-role key, bypasses RLS) touches these.
```

**`recipe-images` storage bucket** — ⚠️ required by the kept `useUploadRecipeImage` hook. Created via SQL so the whole schema (tables + storage) deploys from one migration run instead of requiring a manual dashboard step:

```sql
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

The owner-scoped update/delete policies rely on `useUploadRecipeImage`'s existing filename convention (`<user.id>/<recipe_id or timestamp>.<ext>`), so the first path segment is always the uploader's own user id.

### 4.2 `supabase/migrations/002_seed_food_bank_items.sql`

~50 common food bank items across the categories named in the kickoff prompt (Canned Goods, Dry Goods, Produce, Dairy, Protein, Other) — e.g. canned black beans, canned chickpeas, canned diced tomatoes, canned tuna, canned corn, canned green beans, canned fruit cocktail, canned soup, dry white rice, dry brown rice, dry pasta (spaghetti), dry pasta (macaroni), rolled oats, peanut butter, dry lentils, dry black beans, cornmeal, flour, sugar, cooking oil, powdered milk, shelf-stable milk, cheese, eggs, bread, tortillas, cereal, crackers, canned chicken, ground beef, frozen chicken, canned salmon, chicken broth, tomato sauce, spaghetti sauce, mac and cheese, instant noodles, applesauce, canned peaches, raisins, potatoes, onions, canned pumpkin, salsa, mayonnaise, mustard, ketchup, jam/jelly, coffee, tea, bottled water. `image_url` left `NULL` for all rows — no catalog images exist yet and there's no admin upload tool (explicitly out of scope), so this is deferred rather than faked with placeholder URLs.

## 5. New Hooks (`lib/hooks/`)

- **`useFoodBankItems.ts`** — `useFoodBankItems()` fetches the full catalog ordered by category then name; `useFoodBankItemSearch(query)` does an `ilike` name search for the pantry "add by search" flow.
- **`useUserPantry.ts`** — `useUserPantry()` lists the current user's pantry joined to item name/category; `useAddPantryItem()` inserts (upsert, `ON CONFLICT (user_id, food_bank_item_id) DO NOTHING` semantics via `.upsert()` with `ignoreDuplicates: true`); `useRemovePantryItem()` deletes by row id.
- **`useRecipeRatings.ts`** — `useRecipeRating(recipeId)` returns `{ average, count, userRating }`; `useSubmitRating()` upserts on `(recipe_id, user_id)` conflict.
- **`useRecipes.ts` (rewritten, §3)** — `useRecipes(filters)` / `useRecipe(id)` / `useCreateRecipe()` / `useUpdateRecipe()` / `useDeleteRecipe()` / `useUploadRecipeImage()` (kept). New filter shape:
  ```ts
  type RecipeFilters = {
    search?: string;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    foodBankItemId?: string;
    canMakeNow?: boolean;
    mine?: boolean; // recipes.user_id === current session user, for the Profile tab
  };
  ```
  `useCreateRecipe`/`useUpdateRecipe` accept an additional `foodBankItemIds: string[]` and write the `recipe_food_bank_items` junction rows in the same mutation (delete-then-insert on update, to keep it simple rather than diffing).
  ⚠️ `canMakeNow` is implemented **client-side**: fetch candidate recipes with their tagged `recipe_food_bank_items`, fetch the user's `user_pantry` ids once, and filter in JS to recipes whose full tag set is a subset of the pantry set. This is simpler than a Postgres view/RPC and is fine at the scale of a single community recipe catalog; if the catalog grows large enough for this to matter, it should move server-side then (not now — YAGNI).

## 6. Screens

Four tabs, replacing `app/(tabs)/_layout.tsx` entirely:

1. **Pantry** (`app/(tabs)/index.tsx`) — list of items currently in the user's pantry (grouped by category), swipe/tap to remove, an "Add" flow with three entry points: search the catalog, browse the common list (same catalog, grouped), or Scan (§7).
2. **Recipes** (`app/(tabs)/recipes/index.tsx`) — browse/search all recipes, filter chips for "Can make now," skill level, and food bank item. Recipe detail (`[id].tsx`) and edit (`edit/[id].tsx`) stay under this route group since viewing/editing any recipe is conceptually part of "Recipes," not "Submit."
3. **Submit** (`app/(tabs)/submit/index.tsx`) — replaces the old `AddRecipeModal` action-sheet with a single flow: a manual entry form (reusing `IngredientRow`, `InstructionStep`, `ServingsAdjuster`) with an optional "Paste a URL to prefill" affordance at the top that calls `lib/api/importRecipe.ts` (unchanged) to fill the form fields, plus a food-bank-item tagging picker before save. This directly satisfies the kickoff's "Keep `lib/api/importRecipe.ts` — URL import" instruction without the dropped photo-import path.
4. **Profile** (`app/(tabs)/profile/index.tsx`) — the current user's submitted recipes (via `useRecipes({ mine: true })`), their given ratings, display name edit, and sign-out.

## 7. Photo Pantry-Scan Feature

New edge function `supabase/functions/identify-food-items/index.ts`, modeled directly on the kept `extract-recipe-url`'s auth/CORS/error-handling scaffolding and on the **deleted** `extract-recipe-image`'s vision-message pattern (base64 image in a Claude vision content block) — reusing that shape is why `extract-recipe-image` was worth reading even though it's being removed.

- Request: `{ image_base64: string, media_type?: string }`.
- System prompt: exactly the kickoff's wording — *"Look at this photo of food items from a food bank. List only the distinct food items you can identify. Return a JSON array of strings, each being a common food item name."*
- Response: `{ items: string[] }` (wrapped in an object rather than a bare array, for consistent error-shape handling on the client — `{ error: string }` on failure).
- ⚠️ No rate-limiting table for this endpoint (unlike the recipe-import functions) — the kickoff didn't specify one and adding a new log table for a single new endpoint is scope creep for this kickoff; can be added later if abuse becomes a problem.

Client flow (Pantry tab "Scan" entry point):
1. `expo-image-picker`'s camera launcher captures a photo.
2. Convert to base64, POST to `identify-food-items` via `supabase.functions.invoke()`.
3. ⚠️ **Reconciliation:** Claude's free-text item names won't exactly match the fixed ~50-row catalog, and there's no catalog-editing UI (explicitly out of scope). For each detected name, run an `ilike` search against `food_bank_items.name` and show the best match(es) as tappable suggestion chips (matching `useFoodBankItemSearch`, §5). Names with no reasonable match are shown as "not recognized" and are not addable — the app never invents new catalog rows from scan results.
4. User confirms which matched items to add; confirmed items go through the same `useAddPantryItem()` mutation as manual add.

## 8. `lib/database.types.ts`

Full rewrite. `Database['public']['Tables']` covers `profiles`, `food_bank_items`, `user_pantry`, `recipes`, `recipe_food_bank_items`, `recipe_ratings`, `recipe_import_log`, `recipe_import_cache`. All Simmer Down types (`MealPlan`, `MealPlanEntry`, `GroceryList*`, `RecipeBook*`, `Household*`, `Marketplace*`, `Category`, `Tag`, `Ingredient`'s `aisle_category` field) removed. New `Ingredient` type drops `aisle_category`/`group` (grocery-list concepts) but keeps `name`/`amount`/`unit`.

## 9. Explicitly Not Doing

Everything in the kickoff's "What NOT to build yet" list (household/family sharing, offline-first pantry sync, push notifications, catalog moderation tools), plus, per this design's own scope decisions: the old recipe-card photo-import feature, an `updated_at` auto-trigger on `recipes` (set manually in update mutations for now), rate-limiting on the scan endpoint, and actually running `eas build` (needs the user's interactive EAS login).

## 10. Definition of Done

Unchanged from the kickoff prompt:
- App launches, auth works (login/signup).
- Pantry tab: add items by search, see the list.
- Recipes tab: browse (empty state fine).
- Submit tab: create a recipe, tag food bank items.
- Profile tab: shows the user's submitted recipes.
- Schema deployable to a fresh Supabase project via `supabase db push` or running the two migration files.
- `app.config.ts` / `eas.json` are correct such that `eas build` *would* run cleanly once the user has an EAS project and Supabase credentials — the actual build run is on the user.
