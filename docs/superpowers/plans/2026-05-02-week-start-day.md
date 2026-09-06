# Week Start Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users (and households) configure which day the week starts on for meal planning, settable any time in Settings.

**Architecture:** Add `week_start_day` (0–6) to both `UserPreferences` and `HouseholdPreferences` types, update `getWeekStart()` to accept a start-day param, wire the resolved value through the plan screen, and surface a picker in Settings. Household setting takes priority; solo users write to their profile. No DB migration needed — both preference objects live in existing JSONB columns.

**Tech Stack:** TypeScript, React Native, Expo Router, Zustand (authStore), existing `useUpdateHouseholdPreferences` + `updateProfile` hooks.

---

## File Map

| File | What changes |
|---|---|
| `lib/database.types.ts` | Add `week_start_day?: 0\|1\|2\|3\|4\|5\|6` to `UserPreferences` and `HouseholdPreferences` |
| `lib/utils/dates.ts` | Add `startDay` param to `getWeekStart` |
| `app/(tabs)/plan/index.tsx` | Derive `weekStartDay`, pass to `getWeekStart`, re-snap on change |
| `app/(tabs)/settings/index.tsx` | Add "Week starts on" row + OptionPickerModal |

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `lib/database.types.ts:11-21`

- [ ] **Step 1: Add `week_start_day` to both preference interfaces**

Open `lib/database.types.ts` and replace the two interfaces:

```ts
export interface UserPreferences {
  meal_slots: 'dinner_only' | 'lunch_dinner' | 'all';
  planning_mode: 'weekly' | 'biweekly';
  default_servings: number;
  week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Shared planning settings stored on the household so all members see the same view */
export interface HouseholdPreferences {
  meal_slots: 'dinner_only' | 'lunch_dinner' | 'all';
  planning_mode: 'weekly' | 'biweekly';
  week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd "C:/Projects/Simmer Down"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors related to `week_start_day`.

- [ ] **Step 3: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat: add week_start_day to UserPreferences and HouseholdPreferences types"
```

---

## Task 2: Update `getWeekStart` in dates.ts

**Files:**
- Modify: `lib/utils/dates.ts:1-10`

- [ ] **Step 1: Add `startDay` parameter**

Replace the existing `getWeekStart` function in `lib/utils/dates.ts`:

```ts
/**
 * Get the most recent occurrence of `startDay` on or before `date`.
 * startDay: 0 = Sunday, 1 = Monday, …, 6 = Saturday (default 0).
 * Returns a YYYY-MM-DD string.
 */
export function getWeekStart(date: Date = new Date(), startDay: number = 0): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day - startDay + 7) % 7; // days since last startDay
  d.setDate(d.getDate() - diff);
  return toDateString(d);
}
```

- [ ] **Step 2: Verify the algorithm with a quick mental check**

With `startDay = 1` (Monday) and today = Wednesday (day 3):
- `diff = (3 - 1 + 7) % 7 = 2` ✓ (Wednesday minus 2 days = Monday)

With `startDay = 0` (Sunday) and today = Wednesday (day 3):
- `diff = (3 - 0 + 7) % 7 = 3` ✓ (Wednesday minus 3 days = Sunday)

With `startDay = 1` and today = Monday (day 1):
- `diff = (1 - 1 + 7) % 7 = 0` ✓ (no change — already on Monday)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (the signature change is backward-compatible — `startDay` defaults to 0).

- [ ] **Step 4: Commit**

```bash
git add lib/utils/dates.ts
git commit -m "feat: add startDay param to getWeekStart (default 0 = Sunday)"
```

---

## Task 3: Wire weekStartDay Through the Plan Screen

**Files:**
- Modify: `app/(tabs)/plan/index.tsx`

- [ ] **Step 1: Derive `weekStartDay` after the existing preference derivations**

In `app/(tabs)/plan/index.tsx`, after the `planningMode` block (around line 81), add:

```ts
// Resolve week start day: household → user profile → Sunday (0)
const weekStartDay: number =
  household?.preferences?.week_start_day ??
  profile?.preferences?.week_start_day ??
  0;
```

- [ ] **Step 2: Re-snap `weekStart` when `weekStartDay` changes**

After the `weekStartDay` derivation, add a `useEffect`. Also add `useEffect` to the existing React import if not already there (it is — line 1 already imports it):

```ts
// Re-snap to the correct week boundary when the start day setting changes.
useEffect(() => {
  setWeekStart(getWeekStart(new Date(), weekStartDay));
}, [weekStartDay]);
```

- [ ] **Step 3: Update `goToToday` and `isCurrentWeek` to use `weekStartDay`**

Replace lines 145–147:

```ts
const goToToday = () => setWeekStart(getWeekStart(new Date(), weekStartDay));

const isCurrentWeek = weekStart === getWeekStart(new Date(), weekStartDay);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/plan/index.tsx"
git commit -m "feat: use household/user weekStartDay preference in plan screen"
```

---

## Task 4: Add "Week Starts On" Setting in Settings Screen

**Files:**
- Modify: `app/(tabs)/settings/index.tsx`

- [ ] **Step 1: Add `Calendar` to the lucide imports**

Replace the existing lucide import block:

```ts
import {
  User,
  Users,
  ChevronRight,
  LogOut,
  BookOpen,
  Tag,
  LayoutGrid,
  Check,
  X,
  Pencil,
  ChefHat,
  Calendar,
} from 'lucide-react-native';
```

- [ ] **Step 2: Add `showWeekStart` state alongside the other modal state variables**

After `const [showServings, setShowServings] = useState(false);` add:

```ts
const [showWeekStart, setShowWeekStart] = useState(false);
```

- [ ] **Step 3: Add `week_start_day` to the `prefs` object**

Replace the existing `prefs` block:

```ts
const prefs = {
  planning_mode:
    (household?.preferences?.planning_mode ?? profile?.preferences?.planning_mode ?? 'weekly') as UserPreferences['planning_mode'],
  meal_slots:
    (household?.preferences?.meal_slots ?? profile?.preferences?.meal_slots ?? 'dinner_only') as UserPreferences['meal_slots'],
  default_servings: profile?.preferences?.default_servings ?? 4,
  week_start_day:
    (household?.preferences?.week_start_day ?? profile?.preferences?.week_start_day ?? 0) as NonNullable<UserPreferences['week_start_day']>,
};
```

- [ ] **Step 4: Add the day-name label constant and `weekStartLabel` derivation**

After the `mealSlotsLabel` derivation, add:

```ts
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekStartLabel = DAY_LABELS[prefs.week_start_day];
```

- [ ] **Step 5: Add the "Week starts on" `SettingsRow` inside the PLANNING PREFERENCES group**

In the JSX, inside the PLANNING PREFERENCES `View` group, add a new `SettingsRow` after the "Default servings" row (the last row currently has no `divider` prop — add `divider` to it, then add the new row without `divider`):

Replace:
```tsx
          <SettingsRow
            icon={<ChefHat color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Default servings"
            value={String(prefs.default_servings)}
            colors={colors}
            typography={typography}
            showChevron
            onPress={() => setShowServings(true)}
          />
```

With:
```tsx
          <SettingsRow
            icon={<ChefHat color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Default servings"
            value={String(prefs.default_servings)}
            colors={colors}
            typography={typography}
            showChevron
            divider
            onPress={() => setShowServings(true)}
          />
          <SettingsRow
            icon={<Calendar color={colors.primary} size={18} strokeWidth={1.5} />}
            label="Week starts on"
            value={weekStartLabel}
            colors={colors}
            typography={typography}
            showChevron
            onPress={() => setShowWeekStart(true)}
          />
```

- [ ] **Step 6: Add the `OptionPickerModal` for week start day**

In the modals section at the bottom of the JSX, after the `ServingsModal`, add:

```tsx
      <OptionPickerModal
        visible={showWeekStart}
        title="Week Starts On"
        options={[
          { label: 'Sunday', value: '0' },
          { label: 'Monday', value: '1' },
          { label: 'Tuesday', value: '2' },
          { label: 'Wednesday', value: '3' },
          { label: 'Thursday', value: '4' },
          { label: 'Friday', value: '5' },
          { label: 'Saturday', value: '6' },
        ]}
        selected={String(prefs.week_start_day)}
        onSelect={(v) => handleUpdatePref({ week_start_day: parseInt(v, 10) as NonNullable<UserPreferences['week_start_day']> })}
        onClose={() => setShowWeekStart(false)}
        colors={colors}
        typography={typography}
      />
```

- [ ] **Step 7: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/settings/index.tsx"
git commit -m "feat: add Week Starts On setting to planning preferences"
```

---

## Task 5: Final Verification & Deploy

- [ ] **Step 1: Run a full TypeScript check**

```bash
cd "C:/Projects/Simmer Down"
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 2: Verify the web build still exports**

```bash
npx expo export --platform web 2>&1 | tail -5
```

Expected: `Exported: dist` with no errors.

- [ ] **Step 3: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

- [ ] **Step 4: Manual smoke test checklist**

Open the app (web or Android) and verify:
- [ ] Settings → Planning Preferences shows "Week starts on Sunday" by default
- [ ] Tapping it opens a picker with all 7 days
- [ ] Selecting Monday: the meal plan screen re-snaps to the most recent Monday
- [ ] "Today" button navigates to the correct Monday-based week
- [ ] Week header label (e.g. "Apr 28 – May 4") reflects the new start day
- [ ] Changing back to Sunday restores Sunday-based weeks
- [ ] A solo user (no household) can also change the setting and it persists after app restart
- [ ] A household member changing the setting updates it for all members
