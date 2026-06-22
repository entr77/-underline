-- users.tags 컬럼 제거
-- 취향은 user_taste_profiles.tag_scores (행동 기반)로 대체됨
ALTER TABLE public.users DROP COLUMN IF EXISTS tags;
