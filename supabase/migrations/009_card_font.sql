ALTER TABLE public.underlines
  ADD COLUMN IF NOT EXISTS card_font TEXT NOT NULL DEFAULT 'serif';
