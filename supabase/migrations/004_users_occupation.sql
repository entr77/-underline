-- users 테이블에 직업 컬럼 추가
alter table public.users add column if not exists occupation text;
