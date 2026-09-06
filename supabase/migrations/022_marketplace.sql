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

-- Active listings are readable by all authenticated users (sellers can also see their own drafts/archived)
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
