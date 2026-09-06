# Week Start Day — Design Spec
_2026-05-02_

## Summary

Allow users and households to configure which day the week begins on for meal planning. Household members share a single setting; solo users set their own. The household setting always takes precedence when a household exists.

## Scope

- Configurable week start day (Sunday–Saturday) per household and per user
- Visible and editable in Settings
- Applied everywhere dates are calculated for meal planning

## Data Model

### `UserPreferences` (lib/database.types.ts)
Add `week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6` where 0 = Sunday, 6 = Saturday. Default is 0 (Sunday) when absent.

### `HouseholdPreferences` (lib/database.types.ts)
Same addition: `week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6`.

No DB migration required — both `UserPreferences` and `HouseholdPreferences` are stored in existing JSONB `preferences` columns and updated via existing RPCs (`update_user_preferences`, `update_household_preferences`).

## Resolution Order

```
weekStartDay = household?.preferences?.week_start_day
            ?? profile?.preferences?.week_start_day
            ?? 0  // Sunday
```

Matches the existing pattern used by `meal_slots` and `planning_mode`.

## Logic Changes

### `lib/utils/dates.ts` — `getWeekStart(date, startDay)`

Current: always rolls back to Sunday (`day - 0`).

Updated signature:
```ts
export function getWeekStart(date: Date = new Date(), startDay: number = 0): string
```

Updated algorithm:
```ts
const diff = (day - startDay + 7) % 7;
d.setDate(d.getDate() - diff);
```

All other date utilities (`getWeekDates`, `getBiweekDates`, `getPreviousWeekStart`, `getNextWeekStart`) operate on an already-correct `weekStart` string and need no changes.

## Affected Files

| File | Change |
|---|---|
| `lib/database.types.ts` | Add `week_start_day` to both preference interfaces |
| `lib/utils/dates.ts` | Add `startDay` param to `getWeekStart` |
| `app/(tabs)/plan/index.tsx` | Read `weekStartDay` from preferences, pass to `getWeekStart` |
| `app/(tabs)/settings/household.tsx` | Add picker in household section (updates household prefs) |
| `app/(tabs)/settings/index.tsx` | Add picker in personal section for solo users (updates user prefs) |

## Settings UI

### Household members
"Week starts on" row in the Household settings section. Tapping opens an inline chip row: `Sun Mon Tue Wed Thu Fri Sat`. Selected day highlighted in primary colour. Saves immediately via `useUpdateHouseholdPreferences({ week_start_day: value })`.

### Solo users
Same "Week starts on" chip row, shown in the personal preferences section of Settings. Saves via `updateProfile({ preferences: { ...profile.preferences, week_start_day: value } })`.

The picker appears in exactly one location — never both.

## Behaviour Notes

- **Existing meal plan data is unaffected.** Plans already saved to a `week_start_date` stay at that date; they do not re-anchor when the setting changes.
- **"Go to today"** recalculates using the current `weekStartDay`, so it always lands on the correct week after a setting change.
- **Biweekly mode** is unaffected — `getBiweekDates` extends forward from a correct week start, so it inherits the fix automatically.

## Out of Scope

- Per-member overrides within a household (household setting is authoritative)
- Migrating historical meal plan entries to new week boundaries
- Apple/Google calendar sync
