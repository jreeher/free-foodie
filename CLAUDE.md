# Simmer Down — Project Context for Claude

## What this is
A React Native / Expo SDK 52 meal-planning app backed by Supabase (cloud Postgres + Auth + Storage).
Users manage recipes, build weekly/biweekly meal plans, generate grocery lists, and optionally share
everything with household members.

## Stack
- **Expo SDK 52** · React Native 0.76 · Expo Router v4 (file-based navigation)
- **Supabase** · Auth · Postgres (RLS) · Storage (recipe-images bucket)
- **Zustand** · auth + UI stores (`lib/stores/`)
- **TanStack React Query** · all data fetching/mutations (`lib/hooks/`)
- **expo-dev-client** · custom dev build (not Expo Go), bridgeless/New Architecture mode

## Key architectural decisions

### Auth flow
`useAuthListener` (called once in `app/_layout.tsx`) subscribes to `supabase.auth.onAuthStateChange`
and calls `refreshProfile()` on every session event. The Zustand `useAuthStore` holds `session`,
`user`, `profile`, and `initialized`.

### Profile row bootstrapping
`handle_new_user` (Postgres trigger on `auth.users`) creates the profile row on signup.
**Known issue fixed in migration 012**: the old trigger (001) was missing `SET search_path = ''`,
causing silent failures in Supabase's SECURITY DEFINER context → no profile row created.
`refreshProfile()` now has a fallback: if `PGRST116` (no rows), it auto-inserts the profile.

### Preferences: household vs. solo
- Users in a household → `planning_mode` + `meal_slots` live on `households.preferences` (shared)
- Solo users → those same fields live on `profiles.preferences`
- `default_servings` is always personal (`profiles.preferences`)
- The settings screen uses `profile?.household_id` (Zustand, synchronous) — NOT `household` from
  React Query — to decide which save path to take. `household` is `undefined` while loading and
  would cause the wrong path to be chosen.

### SECURITY DEFINER RPCs (migration 011)
Direct writes to `households` and `profiles` can fail silently in React Native due to an
`auth.uid()` RLS race condition (AsyncStorage timing / token refresh). Three RPCs bypass this:
- `update_user_preferences(prefs JSONB)` — merges into `profiles.preferences`
- `update_household_preferences(prefs JSONB)` — merges into `households.preferences`
- `create_household_for_user(household_name TEXT)` — atomic household create + profile link

### Stale closure pattern
Inside TanStack mutation functions, always read fresh profile data from the store directly:
```typescript
const freshProfile = useAuthStore.getState().profile; // ✅ always fresh
// NOT: const profile = useProfile();                  // ❌ stale closure
```

### Optimistic updates
Both `updateProfile` (Zustand) and `useUpdateHouseholdPreferences` (React Query) apply optimistic
updates immediately and roll back on error.

## Database migration status
All migrations 001–012 should be applied to the cloud DB.
- **001** initial schema
- **007** robust signup trigger, households INSERT policy, categories RLS fix ← was missing from cloud, partially re-applied via 010
- **010** household preferences column, households INSERT policy, categories RLS, user_grocery_prefs table
- **011** three SECURITY DEFINER RPCs for preference/household writes
- **012** fixes `handle_new_user` trigger (SET search_path, ON CONFLICT, EXCEPTION block)

To verify which are applied, check `supabase_migrations.schema_migrations` or just run each
idempotently (all use CREATE OR REPLACE / IF NOT EXISTS / DROP IF EXISTS).

## Important file map
```
lib/
  stores/
    authStore.ts        — session, user, profile, updateProfile, refreshProfile
    uiStore.ts          — toast, loading overlay
    weekRulesStore.ts   — meal plan rules (Zustand + MMKV)
    groceryCategoryStore.ts — ingredient→store-section mappings
  hooks/
    useAuth.ts          — useProfile(), useUser(), useSession(), useAuthListener()
    useHousehold.ts     — household CRUD + invite flow
    useRecipes.ts       — recipe CRUD, categories, tags, image upload
    useMealPlan.ts      — plan entries, week navigation, AI generation
    useGroceryList.ts   — aggregated grocery list from plan entries
  supabase.ts           — Supabase client (AsyncStorage on native, localStorage on web)
  database.types.ts     — TypeScript types generated from DB schema

app/(tabs)/
  settings/index.tsx    — planning prefs, household link, display name
  plan/index.tsx        — weekly/biweekly calendar, drag-to-swap meals, rule indicators
  grocery/index.tsx     — collapsible store sections, drag-to-reorder/recategorise
  recipes/              — list, detail, add, edit, import screens

supabase/migrations/    — all SQL migrations, numbered 001–012
```

## Known gotchas
1. **No profile row on first launch** — fixed by `refreshProfile` PGRST116 fallback + migration 012
2. **`auth.uid()` RLS race on writes** — use SECURITY DEFINER RPCs (migration 011) for any write
   that's failing with RLS violation on React Native
3. **React Query `household` is `undefined` while loading** — never use it as a boolean guard for
   save-path decisions; use `profile?.household_id` from Zustand instead
4. **Grocery drag-and-drop** — sections force-expand when `activeDragItem` is set so every section
   remains a valid drop target
5. **Metro on physical device** — use `adb reverse tcp:8081 tcp:8081` if the device can't find
   the bundler; press `a` in Metro terminal to target Android device specifically
6. **Env vars** — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
   The anon key uses Supabase's newer `sb_publishable_...` format (not a JWT). This is correct.

## Run commands
```bash
npx expo start --clear     # start Metro (clear cache)
npx expo run:android       # build + install dev build on connected device
adb devices                # verify phone is detected
adb reverse tcp:8081 tcp:8081  # forward Metro port to physical device
```
