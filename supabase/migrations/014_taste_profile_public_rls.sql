-- user_taste_profiles SELECT 정책을 공개로 변경
-- (프로필 페이지에서 타인의 성향도 볼 수 있어야 함)

drop policy if exists "본인만 프로파일 조회" on public.user_taste_profiles;

create policy "누구나 취향 프로파일 조회" on public.user_taste_profiles
  for select using (true);
