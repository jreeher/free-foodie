# Recipe Book Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web-only marketplace where users can publish recipe books for free or for up to $19.99, and others can browse, claim (free), or buy (paid — Stripe stub for now) those books, which then appear in their library on both web and app.

**Architecture:** Two new Supabase tables (`marketplace_listings`, `marketplace_purchases`) with RLS, a `useMarketplace` hook file, and four new screens under `app/(tabs)/marketplace/` that are hidden on native via `href: null`. Free ($0) claims run fulfillment immediately on the client (copying the book + all recipes into the buyer's account). Paid books show a "coming soon" stub where Stripe will slot in.

**Tech Stack:** Supabase (Postgres + RLS), React Native Web, Expo Router 4, TanStack Query, expo-image-picker (cover upload reuses existing `recipe-images` bucket).

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `lib/theme/index.ts` | Export `BOOK_PALETTE` so marketplace screens can import it |
| Modify | `app/(tabs)/index.tsx` | Import `BOOK_PALETTE` from theme instead of defining locally |
| Create | `supabase/migrations/022_marketplace.sql` | Tables, constraints, RLS policies |
| Modify | `lib/database.types.ts` | Add `MarketplaceListing`, `MarketplacePurchase` interfaces |
| Create | `lib/hooks/useMarketplace.ts` | All marketplace hooks + fulfillment logic |
| Modify | `app/(tabs)/_layout.tsx` | Add Marketplace tab (web only, `href: null` on native) |
| Create | `app/(tabs)/marketplace/_layout.tsx` | Stack navigator for marketplace screens |
| Create | `app/(tabs)/marketplace/index.tsx` | Browse/discover listings |
| Create | `app/(tabs)/marketplace/[id].tsx` | Listing detail + claim/buy |
| Create | `app/(tabs)/marketplace/publish.tsx` | Publish a book to the marketplace |
| Modify | `app/(tabs)/recipes/index.tsx` | Add "Sell in Marketplace" button to the book-filter banner (web only) |

---

## Task 1: Export BOOK_PALETTE from shared theme

The palette is currently defined inline in `app/(tabs)/index.tsx`. Marketplace screens need it too, so it moves to the theme barrel.

**Files:**
- Modify: `lib/theme/index.ts`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add BOOK_PALETTE to `lib/theme/index.ts`**

Append to the bottom of the file (after the existing exports):

```ts
// lib/theme/index.ts  (add at bottom)
export const BOOK_PALETTE: { cover: string; spine: string; text: string }[] = [
  { cover: '#8B3A52', spine: '#6B2A3E', text: '#FFE8F0' }, // Burgundy
  { cover: '#2C4770', spine: '#1C3760', text: '#E8F0FF' }, // Navy
  { cover: '#3D6B4F', spine: '#2D5B3F', text: '#E8FFF2' }, // Forest
  { cover: '#6B4C8B', spine: '#5A3A7A', text: '#F2E8FF' }, // Plum
  { cover: '#8B6914', spine: '#7A5804', text: '#FFF8E8' }, // Amber
  { cover: '#2B6E6E', spine: '#1B5B5B', text: '#E8FFFF' }, // Teal
  { cover: '#8B4513', spine: '#7A3403', text: '#FFF2E8' }, // Sienna
  { cover: '#4A5E72', spine: '#3A4E62', text: '#EAF2FF' }, // Slate
];

/** Returns a deterministic BOOK_PALETTE index for any string ID. */
export function paletteIndexFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BOOK_PALETTE.length;
}
```

- [ ] **Step 2: Update `app/(tabs)/index.tsx` to use the imported palette**

Remove the local `BOOK_PALETTE` definition (lines that look like `const BOOK_PALETTE: { cover: string; spine: string; text: string }[] = [...]`) and add an import:

```ts
// At the top of app/(tabs)/index.tsx, add to existing theme import:
import { BOOK_PALETTE } from '../../lib/theme';
```

The rest of the home screen code uses `BOOK_PALETTE` identically — no other changes needed.

- [ ] **Step 3: Verify the home screen still renders correctly**

Run `npx expo start --web` and open the browser. Confirm recipe books still show their colored covers on the home screen.

- [ ] **Step 4: Commit**

```bash
git add lib/theme/index.ts app/(tabs)/index.tsx
git commit -m "refactor: move BOOK_PALETTE to shared theme"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/022_marketplace.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/022_marketplace.sql

-- ─── marketplace_listings ───────────────────────────────────────────────────
CREATE TABLE public.marketplace_listings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id             uuid        NOT NULL REFERENCES public.recipe_books(id) ON DELETE CASCADE,
  seller_user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               text        NOT NULL,
  description         text        NOT NULL DEFAULT '',
  price_cents         integer     NOT NULL DEFAULT 0
                                  CHECK (price_cents >= 0 AND price_cents <= 1999),
  featured_recipe_id  uuid        REFERENCES public.recipes(id) ON DELETE SET NULL,
  cover_color_index   integer     NOT NULL DEFAULT 0
                                  CHECK (cover_color_index >= 0 AND cover_color_index <= 7),
  cover_image_url     text,
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'active', 'archived')),
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── marketplace_purchases ──────────────────────────────────────────────────
CREATE TABLE public.marketplace_purchases (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                uuid        NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  buyer_user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid_cents         integer     NOT NULL DEFAULT 0,
  stripe_payment_intent_id  text,
  status                    text        NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'completed')),
  purchased_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, buyer_user_id)
);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.marketplace_listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- Active listings are readable by all authenticated users
CREATE POLICY "Active listings are public"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'active' OR seller_user_id = auth.uid());

-- Sellers manage their own listings
CREATE POLICY "Sellers manage own listings"
  ON public.marketplace_listings FOR INSERT
  WITH CHECK (seller_user_id = auth.uid());

CREATE POLICY "Sellers update own listings"
  ON public.marketplace_listings FOR UPDATE
  USING (seller_user_id = auth.uid())
  WITH CHECK (seller_user_id = auth.uid());

-- Buyers and sellers can see relevant purchases
CREATE POLICY "Buyers see own purchases"
  ON public.marketplace_purchases FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Sellers see purchases of their listings"
  ON public.marketplace_purchases FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.marketplace_listings WHERE seller_user_id = auth.uid()
    )
  );

-- Authenticated users can insert a purchase (free claims; paid claims inserted by webhook later)
CREATE POLICY "Authenticated users can insert purchases"
  ON public.marketplace_purchases FOR INSERT
  WITH CHECK (buyer_user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

In the Supabase dashboard → SQL Editor, paste and run the migration. Confirm both tables appear in Table Editor with the correct columns.

Alternatively via CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_marketplace.sql
git commit -m "feat(db): add marketplace_listings and marketplace_purchases tables"
```

---

## Task 3: TypeScript Types

**Files:**
- Modify: `lib/database.types.ts`

- [ ] **Step 1: Add marketplace interfaces to `lib/database.types.ts`**

Append at the bottom of the file (after the existing exported interfaces):

```ts
// lib/database.types.ts  (add at bottom)

export interface MarketplaceListing {
  id: string;
  book_id: string;
  seller_user_id: string;
  title: string;
  description: string;
  price_cents: number;
  featured_recipe_id: string | null;
  cover_color_index: number;
  cover_image_url: string | null;
  status: 'draft' | 'active' | 'archived';
  published_at: string | null;
  created_at: string;
}

export interface MarketplaceListingInsert {
  book_id: string;
  seller_user_id: string;
  title: string;
  description?: string;
  price_cents?: number;
  featured_recipe_id?: string | null;
  cover_color_index?: number;
  cover_image_url?: string | null;
  status?: 'draft' | 'active' | 'archived';
  published_at?: string | null;
}

export interface MarketplacePurchase {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  amount_paid_cents: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'completed';
  purchased_at: string;
}

/** Listing with denormalized display data used in browse + detail screens. */
export interface MarketplaceListingDetail extends MarketplaceListing {
  seller_name: string;
  recipe_count: number;
  recipe_titles: string[];        // all recipe titles in the book
  featured_recipe: Recipe | null; // full recipe content for the sample
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat(types): add MarketplaceListing and MarketplacePurchase types"
```

---

## Task 4: Marketplace Hooks

**Files:**
- Create: `lib/hooks/useMarketplace.ts`

This file contains all marketplace data access and the fulfillment logic.

- [ ] **Step 1: Create `lib/hooks/useMarketplace.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import {
  MarketplaceListing,
  MarketplaceListingInsert,
  MarketplaceListingDetail,
  Recipe,
} from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { imageUriToArrayBuffer } from '../utils/webCompat';

const LISTINGS_KEY = 'marketplace_listings';
const PURCHASES_KEY = 'marketplace_purchases';

// ─── Browse ──────────────────────────────────────────────────────────────────

export type ListingFilter = 'all' | 'free' | 'paid';

export function useMarketplaceListings(filter: ListingFilter = 'all') {
  const user = useUser();

  return useQuery({
    queryKey: [LISTINGS_KEY, 'browse', filter],
    queryFn: async (): Promise<MarketplaceListingDetail[]> => {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('published_at', { ascending: false });

      if (filter === 'free') query = query.eq('price_cents', 0);
      if (filter === 'paid') query = query.gt('price_cents', 0);

      const { data: listings, error } = await query;
      if (error) throw error;
      if (!listings || listings.length === 0) return [];

      // Fetch seller names
      const sellerIds = [...new Set(listings.map((l: any) => l.seller_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', sellerIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));

      // Fetch recipe counts for each book
      const bookIds = listings.map((l: any) => l.book_id);
      const { data: bookItems } = await supabase
        .from('recipe_book_items')
        .select('recipe_book_id, recipe_id')
        .in('recipe_book_id', bookIds);
      const countMap = new Map<string, number>();
      (bookItems ?? []).forEach((item: any) => {
        countMap.set(item.recipe_book_id, (countMap.get(item.recipe_book_id) ?? 0) + 1);
      });

      return listings.map((l: any): MarketplaceListingDetail => ({
        ...l,
        seller_name: profileMap.get(l.seller_user_id) ?? 'Unknown',
        recipe_count: countMap.get(l.book_id) ?? 0,
        recipe_titles: [],         // not fetched on browse — only on detail
        featured_recipe: null,     // not fetched on browse
      }));
    },
    enabled: !!user,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────────

export function useMarketplaceListing(id: string) {
  const user = useUser();

  return useQuery({
    queryKey: [LISTINGS_KEY, id],
    queryFn: async (): Promise<MarketplaceListingDetail> => {
      const { data: listing, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      // Seller name
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', listing.seller_user_id)
        .single();

      // Recipe titles in the book
      const { data: bookItems } = await supabase
        .from('recipe_book_items')
        .select('recipe_id')
        .eq('recipe_book_id', listing.book_id);
      const recipeIds = (bookItems ?? []).map((i: any) => i.recipe_id);

      let recipe_titles: string[] = [];
      let featured_recipe: Recipe | null = null;

      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, title')
          .in('id', recipeIds);
        recipe_titles = (recipes ?? []).map((r: any) => r.title);
      }

      // Featured recipe (full)
      if (listing.featured_recipe_id) {
        const { data: fr } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', listing.featured_recipe_id)
          .single();
        featured_recipe = fr as Recipe ?? null;
      }

      return {
        ...listing,
        seller_name: sellerProfile?.display_name ?? 'Unknown',
        recipe_count: recipeIds.length,
        recipe_titles,
        featured_recipe,
      };
    },
    enabled: !!user && !!id,
  });
}

// ─── My Listings ─────────────────────────────────────────────────────────────

export function useMyListings() {
  const user = useUser();

  return useQuery({
    queryKey: [LISTINGS_KEY, 'mine', user?.id],
    queryFn: async (): Promise<MarketplaceListing[]> => {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MarketplaceListing[];
    },
    enabled: !!user,
  });
}

// Returns the existing listing for a book, or null
export function useListingForBook(bookId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: [LISTINGS_KEY, 'for-book', bookId],
    queryFn: async (): Promise<MarketplaceListing | null> => {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('book_id', bookId!)
        .eq('seller_user_id', user!.id)
        .limit(1);
      if (error) throw error;
      return (data?.[0] as MarketplaceListing) ?? null;
    },
    enabled: !!user && !!bookId,
  });
}

// ─── Publish / Update ────────────────────────────────────────────────────────

export function usePublishBook() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (input: MarketplaceListingInsert & { id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { id, ...fields } = input;
      const payload = {
        ...fields,
        seller_user_id: user.id,
        status: 'active' as const,
        published_at: new Date().toISOString(),
      };

      if (id) {
        // Update existing listing
        const { data, error } = await supabase
          .from('marketplace_listings')
          .update(payload)
          .eq('id', id)
          .select();
        if (error) throw error;
        return data?.[0] as MarketplaceListing;
      } else {
        // Create new listing
        const { data, error } = await supabase
          .from('marketplace_listings')
          .insert(payload)
          .select();
        if (error) throw error;
        return data?.[0] as MarketplaceListing;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LISTINGS_KEY] });
      showToast('Book published to marketplace!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

export function useArchiveListing() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LISTINGS_KEY] });
      showToast('Listing removed from marketplace', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}

// ─── Ownership checks ────────────────────────────────────────────────────────

/** Returns a Set of listing IDs the current user has already purchased/claimed. Used on the browse screen to show "In your library" badges efficiently (one query, not N). */
export function useMyPurchasedListingIds(): Set<string> {
  const user = useUser();
  const { data } = useQuery({
    queryKey: [PURCHASES_KEY, 'my-ids', user?.id],
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from('marketplace_purchases')
        .select('listing_id')
        .eq('buyer_user_id', user!.id)
        .eq('status', 'completed');
      return (data ?? []).map((r: any) => r.listing_id);
    },
    enabled: !!user,
  });
  return new Set(data ?? []);
}

export function useHasPurchased(listingId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: [PURCHASES_KEY, 'check', listingId, user?.id],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('marketplace_purchases')
        .select('id')
        .eq('listing_id', listingId!)
        .eq('buyer_user_id', user!.id)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user && !!listingId,
  });
}

// ─── Cover image upload ───────────────────────────────────────────────────────

export function useUploadMarketplaceCover() {
  const user = useUser();

  return useMutation({
    mutationFn: async (uri: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const { arrayBuffer, ext } = await imageUriToArrayBuffer(uri);
      const filename = `marketplace-covers/${user.id}/${Date.now()}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(filename, arrayBuffer, { contentType, upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path);
      return publicUrl;
    },
  });
}

// ─── Fulfillment (claim free book) ───────────────────────────────────────────

export function useClaimFreeBook() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (listingId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch listing
      const { data: listing, error: le } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single();
      if (le) throw le;
      if (listing.price_cents !== 0) throw new Error('This book is not free');

      // 2. Get all recipe IDs in the book
      const { data: bookItems, error: bie } = await supabase
        .from('recipe_book_items')
        .select('recipe_id')
        .eq('recipe_book_id', listing.book_id);
      if (bie) throw bie;
      const recipeIds = (bookItems ?? []).map((i: any) => i.recipe_id);

      // 3. Fetch the full recipes
      let copiedRecipeIds: string[] = [];
      if (recipeIds.length > 0) {
        const { data: sourceRecipes, error: re } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);
        if (re) throw re;

        // 4. Insert copies owned by the buyer (strip id so DB generates new UUIDs)
        const copies = (sourceRecipes ?? []).map(({ id, created_at, updated_at, user_id, household_id, ...rest }: any) => ({
          ...rest,
          user_id: user.id,
          household_id: null,
          is_default: false,
        }));

        if (copies.length > 0) {
          const { data: inserted, error: ie } = await supabase
            .from('recipes')
            .insert(copies)
            .select('id');
          if (ie) throw ie;
          copiedRecipeIds = (inserted ?? []).map((r: any) => r.id);
        }
      }

      // 5. Create a new recipe book for the buyer
      const { data: newBook, error: nbe } = await supabase
        .from('recipe_books')
        .insert({ user_id: user.id, name: listing.title, sort_order: 999 })
        .select();
      if (nbe) throw nbe;
      const newBookId = newBook?.[0]?.id;
      if (!newBookId) throw new Error('Failed to create recipe book');

      // 6. Link copied recipes to the new book
      if (copiedRecipeIds.length > 0) {
        const items = copiedRecipeIds.map((rid) => ({
          recipe_book_id: newBookId,
          recipe_id: rid,
        }));
        const { error: rbie } = await supabase.from('recipe_book_items').insert(items);
        if (rbie) throw rbie;
      }

      // 7. Record the purchase
      const { error: pe } = await supabase.from('marketplace_purchases').insert({
        listing_id: listingId,
        buyer_user_id: user.id,
        amount_paid_cents: 0,
        status: 'completed',
      });
      if (pe) throw pe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe_books'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      showToast('Recipe book added to your library!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useMarketplace.ts
git commit -m "feat: add useMarketplace hooks with fulfillment logic"
```

---

## Task 5: Marketplace Tab (layout wiring)

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/marketplace/_layout.tsx`

- [ ] **Step 1: Add the Marketplace tab to `app/(tabs)/_layout.tsx`**

Add this import at the top:
```ts
import { Store } from 'lucide-react-native';
```

Then add a new `<Tabs.Screen>` after the Settings screen:

```tsx
<Tabs.Screen
  name="marketplace"
  options={{
    title: 'Marketplace',
    // Hide on native — marketplace is web-only (avoids App Store policy issues)
    href: Platform.OS === 'web' ? undefined : null,
    tabBarIcon: ({ color }) => <Store color={color} size={20} strokeWidth={2} />,
  }}
/>
```

- [ ] **Step 2: Create `app/(tabs)/marketplace/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="publish" />
    </Stack>
  );
}
```

- [ ] **Step 3: Verify tab appears on web, not on native**

Run `npx expo start --web` — confirm "Marketplace" tab is visible in the browser tab bar.

Run `npx expo start` on a simulator — confirm the Marketplace tab does NOT appear.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/marketplace/_layout.tsx
git commit -m "feat: add web-only Marketplace tab"
```

---

## Task 6: Marketplace Browse Screen

**Files:**
- Create: `app/(tabs)/marketplace/index.tsx`

- [ ] **Step 1: Create `app/(tabs)/marketplace/index.tsx`**

```tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useMarketplaceListings, useMyPurchasedListingIds, ListingFilter } from '../../../lib/hooks/useMarketplace';
import { BOOK_PALETTE, paletteIndexFromId } from '../../../lib/theme';
import { MarketplaceListingDetail } from '../../../lib/database.types';

function priceLabel(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}

function ListingCard({ listing, owned, onPress }: { listing: MarketplaceListingDetail; owned: boolean; onPress: () => void }) {
  const { colors, typography } = useTheme();
  const palette = listing.cover_image_url
    ? null
    : BOOK_PALETTE[listing.cover_color_index ?? paletteIndexFromId(listing.id)];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Cover */}
      <View style={[styles.cardCover, { backgroundColor: palette?.cover ?? '#888' }]}>
        {listing.cover_image_url ? (
          <Image source={{ uri: listing.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <View style={[styles.cardSpine, { backgroundColor: palette!.spine }]} />
            <View style={styles.cardCoverContent}>
              <Text style={[styles.cardTitle, { color: palette!.text, fontFamily: typography.fontFamilies.serifDisplayItalic }]} numberOfLines={3}>
                {listing.title}
              </Text>
              <Text style={[styles.cardCount, { color: palette!.text, fontFamily: typography.fontFamilies.sansRegular }]}>
                {listing.recipe_count} {listing.recipe_count === 1 ? 'recipe' : 'recipes'}
              </Text>
            </View>
          </>
        )}
        {/* Badge: "In your library" takes priority over price */}
        {owned ? (
          <View style={[styles.priceBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.priceText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansBold }]}>
              In library
            </Text>
          </View>
        ) : (
          <View style={[styles.priceBadge, { backgroundColor: listing.price_cents === 0 ? '#2ECC71' : colors.primary }]}>
            <Text style={[styles.priceText, { fontFamily: typography.fontFamilies.sansBold }]}>
              {priceLabel(listing.price_cents)}
            </Text>
          </View>
        )}
      </View>
      {/* Meta */}
      <Text style={[styles.sellerName, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]} numberOfLines={1}>
        by {listing.seller_name}
      </Text>
    </TouchableOpacity>
  );
}

const FILTERS: { label: string; value: ListingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
];

export default function MarketplaceBrowseScreen() {
  const { colors, typography, layout } = useTheme();
  const [filter, setFilter] = useState<ListingFilter>('all');
  const { data: listings, isLoading } = useMarketplaceListings(filter);
  const purchasedIds = useMyPurchasedListingIds();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
          Marketplace
        </Text>
      </View>

      {/* Filter bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={{ paddingHorizontal: layout.screenPaddingH, gap: 8 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterChip, { backgroundColor: filter === f.value ? colors.primary : 'transparent', borderColor: filter === f.value ? colors.primary : colors.border }]}
          >
            <Text style={[styles.filterChipText, { color: filter === f.value ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !listings?.length ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
            No books yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            Be the first to publish a recipe book!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: layout.screenPaddingH, gap: 16 }}
          columnWrapperStyle={{ gap: 16 }}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              owned={purchasedIds.has(item.id)}
              onPress={() => router.push({ pathname: '/(tabs)/marketplace/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28 },
  filterBar: { paddingVertical: 12, borderBottomWidth: 1, flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterChipText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 24, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: { flex: 1 },
  cardCover: {
    height: 180, borderRadius: 8, overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 6, elevation: 5,
    position: 'relative',
  },
  cardSpine: { width: 10, height: '100%' },
  cardCoverContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, lineHeight: 21, flex: 1 },
  cardCount: { fontSize: 11, opacity: 0.7 },
  priceBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  priceText: { color: '#fff', fontSize: 11 },
  sellerName: { marginTop: 6, fontSize: 12 },
});
```

- [ ] **Step 2: Manually test in browser**

Open `http://localhost:8081` → click Marketplace tab. With no listings yet, confirm the empty state shows. After Task 2 migration is applied, try inserting a test listing via Supabase SQL Editor:

```sql
-- Get your user ID first:
SELECT auth.uid();

-- Insert a test listing (replace UUIDs):
INSERT INTO marketplace_listings (book_id, seller_user_id, title, description, price_cents, status, cover_color_index)
VALUES ('<your-book-id>', '<your-user-id>', 'Test Book', 'A test listing', 0, 'active', 2);
```

Confirm the card appears in the grid with a green "Free" badge.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/marketplace/index.tsx
git commit -m "feat: marketplace browse screen"
```

---

## Task 7: Marketplace Detail Screen

**Files:**
- Create: `app/(tabs)/marketplace/[id].tsx`

- [ ] **Step 1: Create `app/(tabs)/marketplace/[id].tsx`**

```tsx
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChefHat } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import {
  useMarketplaceListing,
  useHasPurchased,
  useClaimFreeBook,
} from '../../../lib/hooks/useMarketplace';
import { BOOK_PALETTE, paletteIndexFromId } from '../../../lib/theme';

function priceLabel(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`;
}

export default function MarketplaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, layout } = useTheme();
  const { data: listing, isLoading } = useMarketplaceListing(id);
  const { data: hasPurchased } = useHasPurchased(id);
  const claimFree = useClaimFreeBook();

  if (isLoading || !listing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const palette = listing.cover_image_url
    ? null
    : BOOK_PALETTE[listing.cover_color_index ?? paletteIndexFromId(listing.id)];

  const handleClaim = () => {
    claimFree.mutate(listing.id);
  };

  const handleBuy = () => {
    Alert.alert('Coming Soon', 'Paid purchases will be available once our payment system is set up. Check back soon!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Nav */}
      <View style={[styles.nav, { borderBottomColor: colors.border, paddingHorizontal: layout.screenPaddingH }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Cover */}
        <View style={[styles.coverBlock, { backgroundColor: palette?.cover ?? '#888' }]}>
          {listing.cover_image_url ? (
            <Image source={{ uri: listing.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[styles.coverSpine, { backgroundColor: palette!.spine }]} />
          )}
          <View style={styles.coverOverlay}>
            <Text style={[styles.coverTitle, { color: listing.cover_image_url ? '#fff' : palette!.text, fontFamily: typography.fontFamilies.serifDisplayItalic }]}>
              {listing.title}
            </Text>
            <Text style={[styles.coverSeller, { color: listing.cover_image_url ? 'rgba(255,255,255,0.8)' : palette!.text, fontFamily: typography.fontFamilies.sansRegular }]}>
              by {listing.seller_name}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: layout.screenPaddingH, paddingTop: 24, gap: 24 }}>
          {/* Price + CTA */}
          <View style={styles.ctaRow}>
            <View>
              <Text style={[styles.priceLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                Price
              </Text>
              <Text style={[styles.priceValue, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                {priceLabel(listing.price_cents)}
              </Text>
            </View>
            {hasPurchased ? (
              <View style={[styles.ctaButton, { backgroundColor: colors.border }]}>
                <Text style={[styles.ctaButtonText, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  In your library
                </Text>
              </View>
            ) : listing.price_cents === 0 ? (
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#2ECC71', opacity: claimFree.isPending ? 0.6 : 1 }]}
                onPress={handleClaim}
                disabled={claimFree.isPending}
              >
                {claimFree.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.ctaButtonText, { color: '#fff', fontFamily: typography.fontFamilies.sansMedium }]}>Claim for Free</Text>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={handleBuy}
              >
                <Text style={[styles.ctaButtonText, { color: '#fff', fontFamily: typography.fontFamilies.sansMedium }]}>
                  Buy for {priceLabel(listing.price_cents)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          {listing.description ? (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                About this book
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                {listing.description}
              </Text>
            </View>
          ) : null}

          {/* Recipe list */}
          {listing.recipe_titles.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                {listing.recipe_count} Recipes
              </Text>
              {listing.recipe_titles.map((title, i) => (
                <View key={i} style={[styles.recipeRow, { borderBottomColor: colors.border }]}>
                  <ChefHat color={colors.textSecondary} size={14} strokeWidth={1.5} />
                  <Text style={[styles.recipeTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Featured recipe */}
          {listing.featured_recipe && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>
                Sample Recipe
              </Text>
              <View style={[styles.sampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sampleRecipeTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.serifDisplay }]}>
                  {listing.featured_recipe.title}
                </Text>
                {listing.featured_recipe.description ? (
                  <Text style={[styles.sampleRecipeDesc, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                    {listing.featured_recipe.description}
                  </Text>
                ) : null}

                {listing.featured_recipe.ingredients?.length > 0 && (
                  <>
                    <Text style={[styles.sampleSubtitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Ingredients
                    </Text>
                    {listing.featured_recipe.ingredients.map((ing, i) => (
                      <Text key={i} style={[styles.sampleLine, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                        • {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
                      </Text>
                    ))}
                  </>
                )}

                {listing.featured_recipe.instructions?.length > 0 && (
                  <>
                    <Text style={[styles.sampleSubtitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
                      Instructions
                    </Text>
                    {listing.featured_recipe.instructions.map((step, i) => (
                      <Text key={i} style={[styles.sampleLine, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  coverBlock: { height: 240, flexDirection: 'row', position: 'relative' },
  coverSpine: { width: 14, height: '100%' },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
  } as any,
  coverTitle: { fontSize: 28, lineHeight: 36 },
  coverSeller: { fontSize: 14, marginTop: 4 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, marginBottom: 2 },
  priceValue: { fontSize: 24 },
  ctaButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 140, alignItems: 'center' },
  ctaButtonText: { fontSize: 15 },
  sectionTitle: { fontSize: 17, marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 23 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  recipeTitle: { fontSize: 14, flex: 1 },
  sampleCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  sampleRecipeTitle: { fontSize: 20, marginBottom: 4 },
  sampleRecipeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sampleSubtitle: { fontSize: 14, marginTop: 8, marginBottom: 4 },
  sampleLine: { fontSize: 14, lineHeight: 20 },
});
```

- [ ] **Step 2: Test claim flow**

In the browser, navigate to a free listing's detail page. Tap "Claim for Free". Confirm:
- Toast shows "Recipe book added to your library!"
- The book appears in the home screen recipe books grid
- The button changes to "In your library"

Test paid listing: tap "Buy for $X.XX" → confirm Alert shows "Coming Soon" message.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/marketplace/[id].tsx"
git commit -m "feat: marketplace detail screen with claim flow"
```

---

## Task 8: Publish Screen

**Files:**
- Create: `app/(tabs)/marketplace/publish.tsx`

- [ ] **Step 1: Create `app/(tabs)/marketplace/publish.tsx`**

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '../../../lib/hooks/useTheme';
import { useRecipeBooks } from '../../../lib/hooks/useRecipeBooks';
import { useRecipes } from '../../../lib/hooks/useRecipes';
import {
  usePublishBook,
  useArchiveListing,
  useListingForBook,
  useUploadMarketplaceCover,
} from '../../../lib/hooks/useMarketplace';
import { BOOK_PALETTE } from '../../../lib/theme';

const MIN_PRICE = 0;
const MAX_PRICE = 1999; // cents

function centsToDisplay(cents: number): string {
  return cents === 0 ? '0.00' : (cents / 100).toFixed(2);
}

function displayToCents(s: string): number {
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return Math.min(MAX_PRICE, Math.max(0, Math.round(n * 100)));
}

export default function PublishScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { colors, typography, layout } = useTheme();

  const { data: books } = useRecipeBooks();
  const book = books?.find((b) => b.id === bookId);

  const { data: existingListing, isLoading: listingLoading } = useListingForBook(bookId);

  // Fetch recipes for this book (for featured recipe picker)
  const { data: allRecipes } = useRecipes({ recipeIds: book?.recipe_ids ?? [] });

  const publish = usePublishBook();
  const archive = useArchiveListing();
  const uploadCover = useUploadMarketplaceCover();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('0.00');
  const [featuredRecipeId, setFeaturedRecipeId] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<'color' | 'image'>('color');
  const [coverColorIndex, setCoverColorIndex] = useState(0);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Pre-fill from existing listing or book
  useEffect(() => {
    if (existingListing) {
      setTitle(existingListing.title);
      setDescription(existingListing.description);
      setPriceDisplay(centsToDisplay(existingListing.price_cents));
      setFeaturedRecipeId(existingListing.featured_recipe_id);
      setCoverColorIndex(existingListing.cover_color_index);
      if (existingListing.cover_image_url) {
        setCoverMode('image');
        setCoverImageUrl(existingListing.cover_image_url);
      }
    } else if (book) {
      setTitle(book.name);
    }
  }, [existingListing, book]);

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: Platform.OS !== 'web',
      aspect: [3, 4],
    });
    if (!result.canceled) {
      setCoverImageUri(result.assets[0].uri);
      setCoverMode('image');
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for your listing.');
      return;
    }
    if (!bookId) return;

    let finalCoverImageUrl = coverImageUrl;

    // Upload new cover image if one was picked locally
    if (coverMode === 'image' && coverImageUri) {
      try {
        finalCoverImageUrl = await uploadCover.mutateAsync(coverImageUri);
      } catch (e: any) {
        Alert.alert('Upload failed', e.message);
        return;
      }
    }

    publish.mutate({
      id: existingListing?.id,
      book_id: bookId,
      title: title.trim(),
      description: description.trim(),
      price_cents: displayToCents(priceDisplay),
      featured_recipe_id: featuredRecipeId,
      cover_color_index: coverColorIndex,
      cover_image_url: coverMode === 'image' ? finalCoverImageUrl : null,
    }, {
      onSuccess: () => router.back(),
    });
  };

  const handleArchive = () => {
    if (!existingListing) return;
    Alert.alert('Remove from Marketplace', 'This will hide your listing. You can re-publish it later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        archive.mutate(existingListing.id, { onSuccess: () => router.back() });
      }},
    ]);
  };

  const isBusy = publish.isPending || uploadCover.isPending || archive.isPending;

  if (listingLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: layout.screenPaddingH, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={colors.textPrimary} size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansSemiBold }]}>
          {existingListing ? 'Edit Listing' : 'Publish to Marketplace'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: layout.screenPaddingH, gap: 24, paddingBottom: 60 }}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            LISTING TITLE
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Easy Weeknight Dinners"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            DESCRIPTION
          </Text>
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell buyers what makes this book special..."
            placeholderTextColor={colors.placeholder}
            multiline
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            PRICE (USD, $0.00 – $19.99)
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceDollar, { color: colors.textPrimary, fontFamily: typography.fontFamilies.sansBold }]}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary, fontFamily: typography.fontFamilies.sansRegular }]}
              value={priceDisplay}
              onChangeText={setPriceDisplay}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            Set to $0.00 to offer this book for free.
          </Text>
        </View>

        {/* Cover */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            BOOK COVER
          </Text>
          {/* Toggle */}
          <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.toggleOption, coverMode === 'color' && { backgroundColor: colors.primary }]}
              onPress={() => setCoverMode('color')}
            >
              <Text style={[styles.toggleText, { color: coverMode === 'color' ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Color
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, coverMode === 'image' && { backgroundColor: colors.primary }]}
              onPress={() => { setCoverMode('image'); pickCoverImage(); }}
            >
              <Text style={[styles.toggleText, { color: coverMode === 'image' ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                Image
              </Text>
            </TouchableOpacity>
          </View>

          {coverMode === 'color' ? (
            <View style={styles.paletteRow}>
              {BOOK_PALETTE.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.swatch, { backgroundColor: p.cover, borderWidth: coverColorIndex === i ? 3 : 1, borderColor: coverColorIndex === i ? colors.primary : 'transparent' }]}
                  onPress={() => setCoverColorIndex(i)}
                />
              ))}
            </View>
          ) : (
            <TouchableOpacity style={[styles.imagePicker, { borderColor: colors.border }]} onPress={pickCoverImage}>
              {(coverImageUri || coverImageUrl) ? (
                <Image source={{ uri: coverImageUri ?? coverImageUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Camera color={colors.placeholder} size={24} strokeWidth={1.5} />
                    <ImageIcon color={colors.placeholder} size={24} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.imagePickerLabel, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                    Tap to upload cover image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Featured recipe */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
            SAMPLE RECIPE (optional)
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamilies.sansRegular }]}>
            One recipe shown in full before purchase.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {/* None option */}
            <TouchableOpacity
              style={[styles.recipeChip, { backgroundColor: featuredRecipeId === null ? colors.primary : 'transparent', borderColor: featuredRecipeId === null ? colors.primary : colors.border }]}
              onPress={() => setFeaturedRecipeId(null)}
            >
              <Text style={[styles.recipeChipText, { color: featuredRecipeId === null ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                None
              </Text>
            </TouchableOpacity>
            {(allRecipes ?? []).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.recipeChip, { backgroundColor: featuredRecipeId === r.id ? colors.primary : 'transparent', borderColor: featuredRecipeId === r.id ? colors.primary : colors.border }]}
                onPress={() => setFeaturedRecipeId(r.id)}
              >
                <Text style={[styles.recipeChipText, { color: featuredRecipeId === r.id ? '#fff' : colors.textSecondary, fontFamily: typography.fontFamilies.sansMedium }]}>
                  {r.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Publish button */}
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary, opacity: isBusy ? 0.6 : 1 }]}
          onPress={handlePublish}
          disabled={isBusy}
        >
          {isBusy
            ? <ActivityIndicator color="#fff" />
            : <Text style={[styles.publishBtnText, { color: '#fff', fontFamily: typography.fontFamilies.sansSemiBold }]}>
                {existingListing ? 'Save Changes' : 'Publish'}
              </Text>
          }
        </TouchableOpacity>

        {/* Archive / remove */}
        {existingListing && (
          <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
            <Text style={[styles.archiveBtnText, { color: colors.destructive, fontFamily: typography.fontFamilies.sansMedium }]}>
              Remove from Marketplace
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17 },
  field: { gap: 6 },
  label: { fontSize: 11, letterSpacing: 0.5 },
  hint: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { height: 100, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceDollar: { fontSize: 20 },
  priceInput: { flex: 1 },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  toggleOption: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontSize: 14 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  swatch: { width: 40, height: 40, borderRadius: 6 },
  imagePicker: { height: 160, borderWidth: 2, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', marginTop: 8 },
  imagePickerLabel: { fontSize: 14 },
  recipeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  recipeChipText: { fontSize: 13 },
  publishBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  publishBtnText: { fontSize: 16 },
  archiveBtn: { alignItems: 'center', paddingVertical: 12 },
  archiveBtnText: { fontSize: 15 },
});
```

- [ ] **Step 2: Test publish flow in browser**

1. Navigate to Recipes → filter by a book → tap "Sell in Marketplace" (added in Task 9).
2. Confirm the form pre-fills from the book name.
3. Set a title, description, price $0.00, pick a color, pick a featured recipe → tap Publish.
4. Confirm toast "Book published to marketplace!" and navigation back.
5. Open the Marketplace tab → confirm the listing appears with the correct cover and price.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/marketplace/publish.tsx"
git commit -m "feat: marketplace publish screen"
```

---

## Task 9: Entry Point in Recipes Tab

**Files:**
- Modify: `app/(tabs)/recipes/index.tsx`

The "Sell in Marketplace" button appears in the book-filter banner when viewing a specific book on web only.

- [ ] **Step 1: Add `Store` import to `app/(tabs)/recipes/index.tsx`**

Find the existing lucide import block and add `Store`:

```ts
import { ..., Store } from 'lucide-react-native';
```

- [ ] **Step 2: Add the Sell button to the book banner**

Find the existing book banner block (around line 272) which looks like:

```tsx
{activeBook && (
  <View style={[styles.bookBanner, ...]}>
    <Library size={14} ... />
    <Text ...>{bookName ?? activeBook.name}</Text>
    <TouchableOpacity onPress={() => router.setParams(...)}>
      <X ... />
    </TouchableOpacity>
  </View>
)}
```

Replace it with:

```tsx
{activeBook && (
  <View style={[styles.bookBanner, { backgroundColor: colors.primary + '15', paddingHorizontal: layout.screenPaddingH }]}>
    <Library size={14} color={colors.primary} strokeWidth={2} />
    <Text style={[styles.bookBannerText, { color: colors.primary, fontFamily: typography.fontFamilies.sansMedium, flex: 1 }]}>
      {bookName ?? activeBook.name}
    </Text>
    {Platform.OS === 'web' && (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(tabs)/marketplace/publish', params: { bookId: activeBook.id } })}
        hitSlop={8}
        style={{ marginRight: 8 }}
      >
        <Store color={colors.primary} size={15} strokeWidth={2} />
      </TouchableOpacity>
    )}
    <TouchableOpacity onPress={() => router.setParams({ bookId: undefined, bookName: undefined })} hitSlop={8}>
      <X color={colors.primary} size={14} strokeWidth={2} />
    </TouchableOpacity>
  </View>
)}
```

Note: `Platform` is already imported in this file. If not, add it: `import { ..., Platform } from 'react-native';`

- [ ] **Step 3: Verify the Store icon appears only on web**

In the browser: filter recipes by a book → confirm the store icon appears in the banner. Tap it → confirm navigation to the publish screen with the correct `bookId`.

On a native simulator: filter by a book → confirm the store icon does NOT appear.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/recipes/index.tsx"
git commit -m "feat: add Sell in Marketplace entry point to book filter banner"
```

---

## Final Verification

- [ ] Apply Supabase migration (Task 2) if not already done
- [ ] On web: publish a free book → browse marketplace → claim it → confirm it appears in home screen recipe books
- [ ] On web: confirm paid listing shows "Coming Soon" alert
- [ ] On native simulator: confirm Marketplace tab is not visible
- [ ] On native simulator: confirm claimed book (from web) appears in recipe books
- [ ] Push and verify Vercel deployment:

```bash
git push origin master
```
