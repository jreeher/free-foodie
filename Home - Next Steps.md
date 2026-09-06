# Simmer Down - Home Next Steps

A running checklist of everything to do from home (unrestricted network, Supabase access).

---

## One-Time Setup (do these first)

- [x] Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
  - Go to supabase.com > your project > SQL Editor > New Query
  - Paste the entire file contents and click Run
  - Verify success by checking Table Editor — you should see: profiles, households, household_invites, recipes, categories, tags
  - ⚠️ Applied RLS fix: replaced recursive "Users can view household members profiles" policy with a SECURITY DEFINER helper function `get_my_household_id()`

- [x] Run `supabase/migrations/002_import_tables.sql` in Supabase SQL Editor
  - Same process — adds recipe_import_log and recipe_import_cache tables

- [x] Run `supabase/migrations/003_meal_plan.sql` in Supabase SQL Editor
  - Same process — adds meal_plans and meal_plan_entries tables with RLS policies

- [x] Run `supabase/migrations/004_grocery_list.sql` in Supabase SQL Editor
  - Adds grocery_lists and grocery_list_items tables with RLS + enables Realtime

- [x] Run `supabase/migrations/005_cook_tracking.sql` in Supabase SQL Editor
  - Adds last_cooked_at column to recipes table + index

- [ ] Add your Anthropic API key to Supabase Edge Function secrets
  - Supabase dashboard > Settings > Edge Functions > Add secret
  - Name: ANTHROPIC_API_KEY
  - Value: your key from console.anthropic.com

---

## Deploy Edge Functions (Phase 2 - Recipe Import)

These need the Supabase CLI. Install it first if needed:
```
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Then deploy both functions:
```
npx supabase functions deploy extract-recipe-url
npx supabase functions deploy extract-recipe-image
```

Verify they appear in Supabase dashboard > Edge Functions.

---

## Test the App End-to-End

- [ ] Sign up for a new account (email confirmation is disabled for dev)
- [ ] Add a recipe manually and verify it saves
- [ ] Try importing a recipe from a URL (any food blog)
- [ ] Try importing a recipe from a photo
- [ ] Verify recipe detail screen loads with correct ingredients
- [ ] Test servings scaler (tap +/- and confirm quantities update)
- [ ] Test dark mode (change system appearance)

---

## App Icons (optional but nice)

Replace the placeholder 1x1 pixel PNGs in the assets/ folder with real images:
- assets/icon.png — 1024x1024 px
- assets/splash-icon.png — 1242x2436 px
- assets/adaptive-icon.png — 1024x1024 px
- assets/favicon.png — 196x196 px
- assets/recipe-placeholder.png — 400x400 px (shown when recipe has no photo)

---

## Test on Real Device (Phone)

Option 1 - Personal hotspot (easiest):
1. Turn on phone hotspot
2. Connect laptop to that hotspot
3. Run: npx expo start
4. Scan QR code with Expo Go app

Option 2 - Same WiFi network:
1. Connect both phone and laptop to home WiFi
2. Run: npx expo start
3. Scan QR code with Expo Go app

---

## What's Been Built So Far

### Phase 1 - Complete
- Auth (email/password sign up and sign in)
- Recipe CRUD (create, read, update, delete)
- Recipe list with search, filters, sort
- Recipe detail with servings scaler (shows fractions, e.g. 1 1/2 not 1.5)
- Recipe add and edit forms with photo picker
- Full design system (terracotta colors, DM Serif Display headings, dark mode)
- Supabase schema with row-level security

### Phase 2 - Complete (needs deployment)
- URL import — paste any recipe URL, Claude strips the blog and returns clean JSON
- Photo import — photograph a cookbook page or recipe card
- Review screen — edit AI result before saving
- Rate limiting (20 imports per day per user)
- URL caching (same URL won't call Claude twice)

### Phase 3 - Complete (needs migration run)
- Meal planning calendar (weekly/biweekly view, configurable by preference)
- Assign recipes OR custom meals to day slots (breakfast/lunch/dinner)
- Navigate prev/next weeks, jump back to today
- Copy previous week's meals into current week
- Clear the whole week at once
- Past days shown at reduced opacity
- Recipe picker modal with live search + custom meal tab
- meal_plans and meal_plan_entries tables with RLS

### Phase 4 - Complete (needs migration run)
- Auto-generate grocery list from week's meal plan recipes
- Ingredients scaled to planned servings and combined (e.g., 3 cups flour + 1 cup flour → 4 cups flour)
- Grouped by grocery aisle: Produce, Meat, Dairy, etc.
- Collapsible aisle sections
- Tap any item to check/uncheck it with a strikethrough
- Progress bar showing how many items are checked
- Add custom items manually (appears in "Other" aisle)
- Clear all checked items at once
- Regenerate from meal plan (replaces non-custom items)
- Real-time sync: if a household member checks an item, your screen updates instantly
- grocery_lists and grocery_list_items tables with RLS + Supabase Realtime

### Phase 5 - Complete (needs migration run)
- Household management: create a household, invite members by email, accept/decline invites
- Live member list showing everyone in your household
- Cancel pending sent invites
- Leave household
- Settings screen fully functional:
  - Edit display name (tap profile card)
  - Planning mode: weekly / bi-weekly (drives meal plan screen)
  - Meal slots: dinner only / lunch+dinner / all (drives meal plan slots)
  - Default servings stepper
  - Invite badge on Household row when you have pending invites
- Dedicated Household settings screen at Settings → Household

### Phase 6 - Complete (needs migration run)
- Cook-again tracking: "Mark as Cooked" button on every recipe detail screen
- Shows "Last cooked X days ago" under the button
- Home screen "Time for a comeback" section: recipes not cooked in 60+ days
  (or added 30+ days ago if never cooked)
- Seasonal suggestions already working via season_tags on recipes

---

## Running the App

```
cd "C:\Users\jordanr\Dropbox\Simmer Down"
npx expo start
```

Node.js is installed at C:\Users\jordanr\nodejs\ — it should be on your PATH now.
If npx is not recognized, run this first:
```
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\jordanr\nodejs", "User")
```
Then close and reopen PowerShell.

---

## Environment Variables

File location: C:\Users\jordanr\Dropbox\Simmer Down\.env
```
EXPO_PUBLIC_SUPABASE_URL=https://dmcklyvzfueafzeuilkr.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
```

Note: .env is in .gitignore and not synced anywhere except Dropbox.
