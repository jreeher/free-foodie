# Home Screen + Unsaved Changes Guard Design

**Goal:** Remove the home screen recipe FAB, repurpose the Recipe Books + button to create a book, and guard the Add Recipe screen against accidental back navigation.

**Architecture:** Two independent changes in two files (`app/(tabs)/index.tsx` and `app/(tabs)/recipes/add.tsx`).

**Tech Stack:** React Native Alert, React Navigation `beforeRemove` event, `useCreateRecipeBook` hook.

---

## Change 1: Home Screen

- **Remove** the circular FAB (+ button) from the top-right of the header.
- **Repurpose** the small + button next to "Your Recipe Books" to create a new book:
  - Tap + → show a simple Modal with a single TextInput and a "Create" button.
  - On confirm, call `useCreateRecipeBook().mutate(name)`.
  - State: `showCreateBook: boolean`, `newBookName: string` — both local to the component.
- **Keep** the empty-state "Add your first recipe" CTA (still opens `AddRecipeModal`).

## Change 2: Unsaved Changes Guard (add.tsx)

- **Dirty check:** form is dirty if any of title, description, a named ingredient, or a non-empty instruction step has content.
- **Guard:** `useEffect` subscribes to `navigation.addListener('beforeRemove', ...)`. If dirty and not saving, call `e.preventDefault()` and show an `Alert` with three options:
  - **Keep Editing** (cancel) — dismiss alert, stay on screen.
  - **Discard** (destructive) — dispatch the original navigation action to proceed back.
  - **Save** — call `handleSave()`. A `isSavingRef` ref is set to `true` before save so that the subsequent `router.back()` inside `handleSave` does not re-trigger the alert.
