-- Add notes field to recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS notes text;
