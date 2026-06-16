-- ====================================
-- 밑줄 (Underline) 초기 스키마
-- ====================================

-- users: Supabase Auth 확장 프로필
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null unique,
  bio text,
  avatar_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- books: 카카오 API 기반 책 정보
create table public.books (
  id uuid primary key default gen_random_uuid(),
  kakao_id text not null unique,
  title text not null,
  author text not null,
  publisher text,
  cover_url text,
  isbn text,
  created_at timestamptz not null default now()
);

-- underlines: 핵심 테이블 — 밑줄 친 문장
create table public.underlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  content text not null,
  page_number integer,
  image_url text,
  is_public boolean not null default true,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- likes: 좋아요 (user_id + underline_id UNIQUE)
create table public.likes (
  user_id uuid not null references public.users(id) on delete cascade,
  underline_id uuid not null references public.underlines(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, underline_id)
);

-- ====================================
-- 인덱스
-- ====================================
create index on public.underlines(user_id);
create index on public.underlines(book_id);
create index on public.underlines(created_at desc);
create index on public.underlines(is_public, created_at desc);
create index on public.likes(underline_id);

-- ====================================
-- like_count 자동 동기화 트리거
-- ====================================
create or replace function public.sync_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.underlines set like_count = like_count + 1 where id = NEW.underline_id;
  elsif TG_OP = 'DELETE' then
    update public.underlines set like_count = greatest(0, like_count - 1) where id = OLD.underline_id;
  end if;
  return null;
end;
$$;

create trigger trg_like_count
after insert or delete on public.likes
for each row execute function public.sync_like_count();

-- ====================================
-- updated_at 자동 업데이트 트리거
-- ====================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger trg_underlines_updated_at
before update on public.underlines
for each row execute function public.set_updated_at();

-- ====================================
-- Auth 신규 가입 시 users 행 자동 생성
-- ====================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ====================================
-- RLS (Row Level Security)
-- ====================================
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.underlines enable row level security;
alter table public.likes enable row level security;

-- users RLS
create policy "누구나 프로필 조회" on public.users
  for select using (true);

create policy "본인만 프로필 수정" on public.users
  for update using (auth.uid() = id);

-- books RLS (누구나 읽기, 인증된 사용자만 추가)
create policy "누구나 책 조회" on public.books
  for select using (true);

create policy "인증 사용자 책 추가" on public.books
  for insert with check (auth.uid() is not null);

-- underlines RLS
create policy "공개 밑줄은 누구나 조회" on public.underlines
  for select using (is_public = true or auth.uid() = user_id);

create policy "본인만 밑줄 추가" on public.underlines
  for insert with check (auth.uid() = user_id);

create policy "본인만 밑줄 수정" on public.underlines
  for update using (auth.uid() = user_id);

create policy "본인만 밑줄 삭제" on public.underlines
  for delete using (auth.uid() = user_id);

-- likes RLS
create policy "누구나 좋아요 조회" on public.likes
  for select using (true);

create policy "본인만 좋아요 추가" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "본인만 좋아요 취소" on public.likes
  for delete using (auth.uid() = user_id);
