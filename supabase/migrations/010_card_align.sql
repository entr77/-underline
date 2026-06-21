ALTER TABLE public.underlines
  ADD COLUMN IF NOT EXISTS card_align TEXT NOT NULL DEFAULT 'center';
