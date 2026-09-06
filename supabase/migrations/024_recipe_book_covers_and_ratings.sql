-- Custom cover fields on recipe_books
ALTER TABLE public.recipe_books
  ADD COLUMN IF NOT EXISTS cover_color_index int,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Marketplace ratings
CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   uuid         NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       int          NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read marketplace reviews"
  ON public.marketplace_reviews FOR SELECT USING (true);

CREATE POLICY "Users can manage own reviews"
  ON public.marketplace_reviews FOR ALL USING (auth.uid() = user_id);
