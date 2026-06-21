ALTER TABLE public.underlines
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_underlines_tags ON public.underlines USING GIN (tags);
