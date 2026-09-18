-- Attaches photos to the 8 seeded Neighbor Impact recipes. 7 were isolated
-- from the source PDFs; Pumpkin Mac & Cheese had no photo in its source card,
-- so that one is a separately supplied photo instead. All uploaded to the
-- recipe-images storage bucket under seed/.
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/chili.png' WHERE title = 'Vegetarian Chili';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/red-lentil-pumpkin-soup.png' WHERE title = 'Red Lentil & Pumpkin Soup';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/roasted-rutabaga.png' WHERE title = 'The Easiest Roasted Rutabaga';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/parmesan-polenta.jpg' WHERE title = 'Parmesan Polenta';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/hummus.png' WHERE title = 'Chickpea Hummus';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/pumpkin-coffee-cake.png' WHERE title = 'Pumpkin Coffee Cake';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/pumpkin-chili.png' WHERE title = 'Pumpkin Chili';
UPDATE public.recipes SET image_url = 'https://qmjezbgtbgroefhbrell.supabase.co/storage/v1/object/public/recipe-images/seed/pumpkin-mac-cheese.jpg' WHERE title = 'Pumpkin Mac & Cheese';
