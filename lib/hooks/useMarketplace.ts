import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import {
  MarketplaceListing,
  MarketplaceListingInsert,
  MarketplaceListingDetail,
  MarketplaceRatingSummary,
  Recipe,
} from '../database.types';
import { useUser } from './useAuth';
import { useUIStore } from '../stores/uiStore';
import { RECIPE_BOOKS_KEY } from './useRecipeBooks';
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

      // Fetch aggregate ratings
      const listingIds = listings.map((l: any) => l.id);
      const { data: reviews } = await supabase
        .from('marketplace_reviews')
        .select('listing_id, rating')
        .in('listing_id', listingIds);
      const ratingMap = new Map<string, { sum: number; count: number }>();
      (reviews ?? []).forEach((r: any) => {
        const cur = ratingMap.get(r.listing_id) ?? { sum: 0, count: 0 };
        ratingMap.set(r.listing_id, { sum: cur.sum + r.rating, count: cur.count + 1 });
      });

      return listings.map((l: any): MarketplaceListingDetail => {
        const ratingData = ratingMap.get(l.id);
        return {
          ...l,
          seller_name: profileMap.get(l.seller_user_id) ?? 'Unknown',
          recipe_count: countMap.get(l.book_id) ?? 0,
          recipe_titles: [],
          featured_recipe: null,
          avg_rating: ratingData && ratingData.count > 0 ? ratingData.sum / ratingData.count : null,
          rating_count: ratingData?.count ?? 0,
        };
      });
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

      // Fetch aggregate rating
      const { data: reviews } = await supabase
        .from('marketplace_reviews')
        .select('rating')
        .eq('listing_id', id);
      const reviewArr = reviews ?? [];
      const rating_count = reviewArr.length;
      const avg_rating = rating_count > 0
        ? reviewArr.reduce((s: number, r: any) => s + r.rating, 0) / rating_count
        : null;

      return {
        ...listing,
        seller_name: sellerProfile?.display_name ?? 'Unknown',
        recipe_count: recipeIds.length,
        recipe_titles,
        featured_recipe,
        avg_rating,
        rating_count,
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
      };

      if (id) {
        // Update: do NOT reset published_at
        const { data, error } = await supabase
          .from('marketplace_listings')
          .update(payload)
          .eq('id', id)
          .select();
        if (error) throw error;
        return data?.[0] as MarketplaceListing;
      } else {
        // Insert: set published_at now
        const { data, error } = await supabase
          .from('marketplace_listings')
          .insert({ ...payload, published_at: new Date().toISOString() })
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
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('seller_user_id', user.id);
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
  // Returns empty Set during loading — callers should use isLoading from useMarketplaceListings
  // to gate display rather than trying to distinguish "loading" from "no purchases".
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
        .eq('status', 'completed')
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
      const filename = `${user.id}/marketplace-covers/${Date.now()}.${ext}`;
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

// ─── Ratings ─────────────────────────────────────────────────────────────────

const REVIEWS_KEY = 'marketplace_reviews';

export function useMarketplaceRating(listingId: string | undefined) {
  const user = useUser();

  return useQuery({
    queryKey: [REVIEWS_KEY, listingId, user?.id],
    queryFn: async (): Promise<MarketplaceRatingSummary> => {
      const { data, error } = await supabase
        .from('marketplace_reviews')
        .select('rating, user_id')
        .eq('listing_id', listingId!);
      if (error) throw error;

      const reviews = data ?? [];
      const count = reviews.length;
      const average = count > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count
        : 0;
      const userRating = reviews.find((r: any) => r.user_id === user!.id)?.rating ?? null;

      return { average, count, userRating };
    },
    enabled: !!user && !!listingId,
  });
}

export function useRateMarketplaceListing() {
  const qc = useQueryClient();
  const user = useUser();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ listingId, rating }: { listingId: string; rating: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('marketplace_reviews')
        .upsert(
          { listing_id: listingId, user_id: user.id, rating },
          { onConflict: 'listing_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, { listingId }) => {
      qc.invalidateQueries({ queryKey: [REVIEWS_KEY, listingId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
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

      // Idempotency: if already claimed, return early
      const { data: existing } = await supabase
        .from('marketplace_purchases')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_user_id', user.id)
        .eq('status', 'completed')
        .limit(1);
      if (existing && existing.length > 0) return;

      // 1. Fetch listing
      const { data: listing, error: le } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single();
      if (le) throw le;
      if (listing.price_cents !== 0) throw new Error('This book is not free');

      // Sellers cannot claim their own listing
      if (listing.seller_user_id === user.id) {
        throw new Error("You can't claim your own recipe book listing.");
      }

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
      // Determine next sort_order
      const { data: existingBooks } = await supabase
        .from('recipe_books')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      const nextSortOrder = existingBooks?.[0]?.sort_order != null
        ? existingBooks[0].sort_order + 1
        : 1;

      const { data: newBook, error: nbe } = await supabase
        .from('recipe_books')
        .insert({ user_id: user.id, name: listing.title, sort_order: nextSortOrder })
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
      qc.invalidateQueries({ queryKey: [RECIPE_BOOKS_KEY] });
      // NOTE: must match RECIPES_KEY in useRecipes.ts
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: [PURCHASES_KEY] });
      showToast('Recipe book added to your library!', 'success');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
}
