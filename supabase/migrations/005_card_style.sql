-- card_style: 사진 포함('photo') 또는 텍스트만('text')
ALTER TABLE public.underlines ADD COLUMN IF NOT EXISTS card_style TEXT NOT NULL DEFAULT 'text';
UPDATE public.underlines SET card_style = 'text' WHERE card_style = 'classic' OR card_style = 'dark' OR card_style = 'forest';
