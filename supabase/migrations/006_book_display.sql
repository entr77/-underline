-- 책 표기 방식 컬럼 추가
-- 값: 'full' (표지+이름, 기본) | 'cover' (표지만) | 'none' (표기 안함)
ALTER TABLE public.underlines
  ADD COLUMN IF NOT EXISTS book_display TEXT NOT NULL DEFAULT 'full';
