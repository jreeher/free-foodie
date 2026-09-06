# Recipe Book Marketplace Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A web-only marketplace where users can publish recipe books for others to browse, claim (free), or purchase (paid, $0–$19.99). Purchased books sync to the buyer's app automatically.

**Architecture:** Two new Supabase tables (`marketplace_listings`, `marketplace_purchases`), new RLS policies, a fulfillment hook that copies books + recipes into the buyer's account, and a web-only Marketplace tab in the Expo Router app.

**Tech Stack:** Supabase (Postgres + RLS + Edge Functions later for Stripe), React Native Web, Expo Router, TanStack Query. Stripe integration deferred — stubs in place.

---

## Data Model

### `marketplace_listings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `book_id` | uuid FK → recipe_books | The source book being sold |
| `seller_user_id` | uuid FK → auth.users | |
| `title` | text | Marketplace display title (defaults to book name) |
| `description` | text | Marketing copy shown on the listing |
| `price_cents` | integer | 0–1999 (i.e. $0.00–$19.99) |
| `featured_recipe_id` | uuid FK → recipes nullable | The one sample recipe shown before purchase |
| `cover_color_index` | integer nullable | Index into `BOOK_PALETTE` (0–7). Used when no image. |
| `cover_image_url` | text nullable | Uploaded cover image. Takes priority over color when present. |
| `status` | text | `draft` \| `active` \| `archived` |
| `published_at` | timestamptz nullable | Set when status → active |
| `created_at` | timestamptz | |

### `marketplace_purchases`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `listing_id` | uuid FK → marketplace_listings | |
| `buyer_user_id` | uuid FK → auth.users | |
| `amount_paid_cents` | integer | Snapshot of price at time of purchase |
| `stripe_payment_intent_id` | text nullable | Null for free ($0) claims |
| `status` | text | `pending` \| `completed` |
| `purchased_at` | timestamptz | |

### RLS Policies

- `marketplace_listings`: any authenticated user can SELECT active listings; seller can INSERT/UPDATE their own listings.
- `marketplace_purchases`: buyer and seller can SELECT their own rows; INSERT allowed for authenticated users (free claims insert directly; paid claims inserted by webhook later).

---

## Fulfillment Logic

When a purchase/claim completes, a `fulfillClaimedBook(listingId)` function:
1. Fetches all recipes in the source book via `recipe_book_items`.
2. Inserts copies of each recipe into `recipes` with the buyer's `user_id` (new IDs, same content).
3. Creates a new `recipe_books` row for the buyer named after the listing title.
4. Inserts `recipe_book_items` linking the new book to the copied recipes.
5. Invalidates `recipe_books` and `recipes` query cache — books appear in app on next sync.

Free ($0) claims run fulfillment immediately on the client.
Paid claims: fulfillment runs after Stripe webhook confirms payment (deferred). Until then, the "Buy" button shows a "Payment coming soon" stub.

---

## Web-Only Marketplace Tab

The Marketplace tab is added to `app/(tabs)/_layout.tsx` but hidden on native:
```ts
// In Tabs.Screen options:
href: Platform.OS === 'web' ? '/marketplace' : null,
```

Route: `app/(tabs)/marketplace/index.tsx` (browse) and `app/(tabs)/marketplace/[id].tsx` (detail).

---

## UI Flows

### Publishing a Book (web only)

Entry point: recipe book detail screen → "Publish to Marketplace" button (web only).

Flow:
1. Sheet/modal opens with fields: Title (pre-filled from book name), Description, Price (slider or input, $0–$19.99), Featured Recipe (picker from the book's recipes).
2. **Cover** — seller chooses one of two options (toggle):
   - **Color** — pick from the 8 `BOOK_PALETTE` swatches (one shown as selected, tap to change).
   - **Image** — upload a custom cover photo (uses same `useUploadRecipeImage` infrastructure, stored in Supabase Storage under a `marketplace-covers/` bucket path). If an image is uploaded it takes priority over the color in all display contexts.
3. Preview panel shows how the listing will look with the chosen cover.
4. "Publish" button sets status → `active`, records `published_at`.
5. Seller can return to edit or archive the listing.

### Marketplace Browse (`/marketplace`)

- Grid of active listings: cover shown as uploaded image (if `cover_image_url` set) or `BOOK_PALETTE[cover_color_index]` color block, seller display name, recipe count, price badge ("Free" or "$X.XX").
- Filter bar: All / Free / Paid.
- Sort: Newest (default).
- Owned/already-claimed books show a "In your library" badge instead of a price.

### Book Detail (`/marketplace/[id]`)

Sections:
1. **Header** — cover image (if uploaded) or color block, title, seller name, price.
2. **Description** — listing description text.
3. **Recipes** — full list of recipe titles in the book (count shown).
4. **Featured Recipe** — full recipe rendered (ingredients + instructions), labeled "Sample recipe".
5. **CTA** — "Claim for Free" (green, $0 books) or "Buy for $X.XX" (primary color, paid books → stub for now). Already-owned books show "In your library" (disabled).

### After Claim/Purchase

- Fulfillment runs (immediately for free, after webhook for paid).
- Toast: "Recipe book added to your library!"
- Buyer's `recipe_books` list updates — book visible in web and app.

---

## What Is Deferred (Stripe)

- Stripe Checkout session creation (Supabase Edge Function).
- Stripe webhook → marks purchase `completed` → triggers fulfillment server-side.
- Seller Connect onboarding + payouts.

The "Buy for $X.XX" button and the `stripe_payment_intent_id` column are in place so Stripe slots in without schema changes.

---

## Out of Scope

- Ratings or reviews.
- Search (browse + filter is sufficient for v1).
- Seller analytics dashboard.
- Refunds (handled manually until scale warrants automation).
