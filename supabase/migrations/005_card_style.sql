-- card_style: 밑줄 카드 배경 스타일
ALTER TABLE public.underlines ADD COLUMN card_style TEXT NOT NULL DEFAULT 'classic';
