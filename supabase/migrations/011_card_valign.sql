ALTER TABLE public.underlines
  ADD COLUMN IF NOT EXISTS card_valign TEXT NOT NULL DEFAULT 'bottom';
