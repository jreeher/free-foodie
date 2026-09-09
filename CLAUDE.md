# Free Foodie — Project Context for Claude

## What this is
A React Native / Expo SDK 52 community recipe app for people who visit food banks. Users log
food items they received into a personal pantry, then browse or submit recipes tagged to those
same canonical "food bank items" (canned chickpeas, dry rice, peanut butter, etc.). Anyone can
submit and rate recipes. A "Can make now" filter shows only recipes where the user's pantry
covers every tagged item.

Forked from an earlier app called Simmer Down (personal recipe/meal-planning app) — most of the
UI kit, auth, and theme system carried over unchanged; the database schema, hooks, and all four
tab screens were rebuilt from scratch for this app's actual purpose. Full history of that rebuild
— every design decision, why, and what changed mid-build — lives in:
- `docs/superpowers/specs/2026-09-05-free-foodie-kickoff-design.md` (the spec)
- `docs/superpowers/specs/2026-09-05-free-foodie-decisions-log.md` (judgment calls + bugs found, in order)
- `docs/superpowers/plans/2026-09-05-free-foodie-kickoff.md` (the task-by-task build plan)

## Stack
- **Expo SDK 52** · React Native 0.76 · Expo Router v4 (file-based navigation)
- **Supabase** · Auth · Postgres (RLS) · Storage (`recipe-images` bucket) · Edge Functions
- **Zustand** · auth + UI stores (`lib/stores/`)
- **TanStack React Query v5** · all data fetching/mutations (`lib/hooks/`), persisted to
  AsyncStorage via `@tanstack/react-query-persist-client` (cache key `freefoodie-query-cache-v1`)
- **Lucide React Native** icons · DM Serif Display / DM Sans / JetBrains Mono fonts

No household concept, no meal planning, no grocery lists — those were Simmer Down features,
deliberately not carried forward.

## Database schema
Two migrations, run in order against a fresh Supabase project:
- **`001_initial.sql`** — all 8 tables (`profiles`, `food_bank_items`, `user_pantry`, `recipes`,
  `recipe_food_bank_items`, `recipe_ratings`, `recipe_import_log`, `recipe_import_cache`), RLS +
  policies for all of them, the `handle_new_user` trigger, and the `recipe-images` storage bucket
  + its policies.
- **`002_seed_food_bank_items.sql`** — ~62 common food bank items across 5 categories.

Ratings are a separate table (`recipe_ratings`, one row per user per recipe), not a column on
`recipes` — average/count/userRating are computed in `useRecipeRatings.ts`, not stored.
Recipe-to-item tagging is a junction table (`recipe_food_bank_items`), not an array column.

## Key architectural decisions

### Auth flow — unchanged from Simmer Down
`useAuthListener` (called once in `app/_layout.tsx`) subscribes to `supabase.auth.onAuthStateChange`
and calls `refreshProfile()` on every session event. `useAuthStore` (Zustand) holds `session`,
`user`, `profile`, `initialized`. `profiles` is now minimal — just `user_id`, `email`,
`display_name` — no `household_id`, no `preferences` JSONB.

### Profile row bootstrapping
`handle_new_user` (Postgres trigger on `auth.users`) creates the profile row on signup, written
with `SET search_path = ''` and an exception-swallowing block **from the start** — Simmer Down's
original version of this trigger was missing both and silently failed, requiring a later fix
migration (their 012). No reason to reintroduce that bug here. `refreshProfile()` still has the
same `PGRST116` (no rows) fallback as a second safety net.

`updateProfile` (Zustand) only handles `display_name` now — no preferences RPC, no household
RPC, since neither concept exists. Note: Simmer Down had a documented `auth.uid()` RLS race
condition on React Native writes, worked around with SECURITY DEFINER RPCs for every
profile/household write (their migration 011). That workaround was **not** carried forward for
the simpler `display_name`-only update — if display-name saves ever start failing silently
on-device, that RPC pattern is the known fix (see decisions log, implementation-phase item 1).

### `RecipeWithMeta` — recipes are enriched, not stored flat
`lib/hooks/useRecipes.ts`'s `attachMeta()` batches three follow-up queries (tags, ratings,
submitter profile names) across a whole list of recipes at once — not per-row — and merges them
onto each `Recipe` row as `foodBankItemIds`, `avgRating`, `ratingCount`, `submitterName`. Every
screen that displays a recipe works with this enriched `RecipeWithMeta` type, not the raw
`recipes` table row.

### `canMakeNow` filtering is client-side
Implemented in `useRecipes.ts` by fetching the user's `user_pantry` ids and filtering recipes
whose full tag set is a subset, in JS — not a Postgres view/RPC. Simpler, fine at this app's
scale; revisit if the catalog/recipe count grows large enough for it to matter.

### Photo pantry-scan reconciliation
`identify-food-items` (edge function) returns free-text item names from Claude's vision call.
These never exactly match the fixed ~62-row catalog, and there's intentionally no
catalog-editing UI. `components/pantry/AddPantryModal.tsx` fuzzy-matches (`ilike`-style
substring match, done client-side) each detected name against `food_bank_items.name` and shows
matches as tappable confirmation chips; names with no reasonable match are dropped rather than
used to invent new catalog rows.

### The `Database` type needs more than `Tables`
`lib/database.types.ts`'s `Database` type must include `Relationships: []` on every table plus
`Views`/`Functions`/`Enums`/`CompositeTypes: { [_ in never]: never }` at the schema level — not
just obvious from the schema SQL. Without these, `@supabase/supabase-js` (resolved to 2.103.0
in this project despite `package.json` only pinning `^2.45.4`) fails to resolve `.insert()` /
`.update()` / `.upsert()` overloads correctly and reports "no overload matches" / argument type
`never` on every mutation hook — a TypeScript-only problem, not a runtime one, but one that will
recur on any new table added later if this is forgotten.

## Important file map
```
lib/
  stores/
    authStore.ts          — session, user, profile, updateProfile (display_name only), refreshProfile
    uiStore.ts             — toast
  hooks/
    useAuth.ts              — useProfile(), useUser(), useSession(), useAuthListener()
    useTheme.ts             — colors/typography/spacing per color scheme
    useFoodBankItems.ts     — catalog fetch, search, groupByCategory
    useUserPantry.ts        — list/add/remove pantry items
    useRecipes.ts           — recipe CRUD + RecipeWithMeta enrichment + filters (search/skillLevel/foodBankItemId/canMakeNow/mine)
    useRecipeRatings.ts     — average/count/userRating, submit rating
  api/
    importRecipe.ts         — importFromUrl() calls extract-recipe-url edge function
  supabase.ts               — typed Supabase client (createClient<Database>)
  database.types.ts         — hand-written types matching the two migrations

app/(tabs)/
  index.tsx                — Pantry (list + AddPantryModal: search/browse/scan)
  recipes/                 — index (browse/filter), [id] (detail+rating), edit/[id]
  submit/index.tsx         — create a recipe (RecipeForm, create mode)
  profile/index.tsx        — display name, sign out, "my recipes"

components/
  recipe/RecipeForm.tsx     — shared create+edit form (also used by recipes/edit/[id].tsx)
  recipe/RecipeCard.tsx, FoodBankItemPicker.tsx
  pantry/AddPantryModal.tsx, PantryItemRow.tsx

supabase/
  migrations/               — 001_initial.sql, 002_seed_food_bank_items.sql
  functions/
    extract-recipe-url/     — kept from Simmer Down, needs recipe_import_log/cache tables
    identify-food-items/    — new, pantry photo-scan (Claude vision call)
```

## Known gotchas
1. **`Database` type needs `Relationships`/`Views`/`Functions`/`Enums`/`CompositeTypes`** — see above. Forgetting this on a new table breaks that table's mutation hooks with confusing TS errors.
2. **Every folder-based tab route needs its own `_layout.tsx`** — without one, Expo Router registers the route as `<folder>/index` instead of `<folder>`, which won't match `app/(tabs)/_layout.tsx`'s `<Tabs.Screen name="...">`. Bit both `submit/` and `profile/` during the kickoff; only caught by actually running the app, not by `tsc`.
3. **`recipe-images` storage bucket needs no `SELECT` policy on `storage.objects`.** The bucket is public, so direct-URL downloads work regardless of RLS; a `SELECT` policy only enables *listing* the bucket, which the app never does and which leaks every uploaded file's `<user_id>` prefix. Supabase's own Security Advisor flags this if added.
4. **`tsc --noEmit` will never be fully clean on this repo.** `supabase/functions/**/*.ts` (Deno) can't type-check under the app's Node/RN tsconfig — structural, not fixable without excluding them. `lib/theme/colors.ts` has a pre-existing `darkColors: typeof lightColors` literal-widening bug unrelated to any of this. `app/_layout.tsx` imports `DMSans_600SemiBold`, which the installed `@expo-google-fonts/dm-sans` version doesn't export (falls back gracefully — there's a 3s timeout that renders the app regardless of font-load success). None of these are regressions to chase; check the decisions log before "fixing" any of them.
5. **Env vars — get the right key.** `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be the `anon`/`public` key specifically. Supabase has three easily-confused credential shapes: a personal access token (`sbp_...`, account-wide, management API), the `service_role` key (bypasses all RLS), and the `anon` key (the only one safe to ship in a client bundle). Decode the JWT's payload (`echo <payload-segment> | base64 -d`) and check `"role"` if ever unsure — should say `"anon"`, not `"service_role"`. Getting this wrong happened once already during setup; both wrong keys were rotated.
6. **EAS builds don't see local `.env`.** Cloud builds need the same `EXPO_PUBLIC_*` vars registered via `eas env:create` (or the EAS dashboard), separately from the local `.env` file.

## Run commands
```bash
npx expo start --web       # start Metro, web preview
npx expo start              # start Metro, scan QR with Expo Go / dev client
npx tsc --noEmit             # type-check (see gotcha #4 for expected baseline noise)
npx supabase db push         # apply pending migrations to the linked project
npx supabase functions deploy <name>   # deploy an edge function
npx supabase secrets set ANTHROPIC_API_KEY=...   # required by both edge functions
```
