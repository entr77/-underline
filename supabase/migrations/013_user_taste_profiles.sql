-- ====================================
-- 사용자 취향 프로파일 테이블
-- ====================================

create table public.user_taste_profiles (
  user_id               uuid primary key references public.users(id) on delete cascade,

  -- 장르 분포: { "소설": 0.45, "에세이": 0.30, "자기계발": 0.25 }
  genre_scores          jsonb not null default '{}',

  -- 태그 분포: { "철학": 12, "관계": 8, "고독": 5 }
  -- 내 밑줄 태그 +1.0점 / 좋아요한 밑줄 태그 +1.5점
  tag_scores            jsonb not null default '{}',

  -- 문장 스타일
  avg_sentence_length   integer,      -- 밑줄 문장 평균 길이(자)
  prefers_short         boolean,      -- true: ~50자 선호, false: 100자+ 선호

  -- 활동 통계 (추천 신뢰도 판단)
  total_underlines      integer not null default 0,
  total_likes           integer not null default 0,

  computed_at           timestamptz not null default now()
);

-- ====================================
-- RLS
-- ====================================
alter table public.user_taste_profiles enable row level security;

create policy "본인만 프로파일 조회" on public.user_taste_profiles
  for select using (auth.uid() = user_id);

create policy "본인만 프로파일 수정" on public.user_taste_profiles
  for all using (auth.uid() = user_id);

-- ====================================
-- 취향 프로파일 재계산 함수
-- user_id를 받아 underlines + likes 기반으로 집계
-- ====================================
create or replace function public.recompute_taste_profile(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_genre_scores   jsonb := '{}';
  v_tag_scores     jsonb := '{}';
  v_avg_len        integer;
  v_prefers_short  boolean;
  v_total_ul       integer;
  v_total_lk       integer;
  rec              record;
begin
  -- 장르 분포: 내 밑줄 기반 (books.genre)
  for rec in
    select b.genre, count(*) as cnt
    from public.underlines u
    join public.books b on b.id = u.book_id
    where u.user_id = p_user_id
      and b.genre is not null
    group by b.genre
  loop
    v_genre_scores := jsonb_set(
      v_genre_scores,
      array[rec.genre],
      to_jsonb(rec.cnt::integer)
    );
  end loop;

  -- 태그 분포: 내 밑줄 태그 (+1.0점)
  for rec in
    select unnest(tags) as tag, count(*) as cnt
    from public.underlines
    where user_id = p_user_id
    group by tag
  loop
    v_tag_scores := jsonb_set(
      v_tag_scores,
      array[rec.tag],
      to_jsonb(
        coalesce((v_tag_scores->rec.tag)::numeric, 0) + rec.cnt::numeric * 1.0
      )
    );
  end loop;

  -- 태그 분포: 좋아요한 밑줄 태그 (+1.5점)
  for rec in
    select unnest(u.tags) as tag, count(*) as cnt
    from public.likes l
    join public.underlines u on u.id = l.underline_id
    where l.user_id = p_user_id
    group by tag
  loop
    v_tag_scores := jsonb_set(
      v_tag_scores,
      array[rec.tag],
      to_jsonb(
        coalesce((v_tag_scores->rec.tag)::numeric, 0) + rec.cnt::numeric * 1.5
      )
    );
  end loop;

  -- 문장 스타일
  select
    round(avg(length(content)))::integer,
    avg(length(content)) < 60,
    count(*)
  into v_avg_len, v_prefers_short, v_total_ul
  from public.underlines
  where user_id = p_user_id;

  select count(*) into v_total_lk
  from public.likes
  where user_id = p_user_id;

  -- upsert
  insert into public.user_taste_profiles
    (user_id, genre_scores, tag_scores, avg_sentence_length, prefers_short, total_underlines, total_likes, computed_at)
  values
    (p_user_id, v_genre_scores, v_tag_scores, v_avg_len, v_prefers_short, coalesce(v_total_ul, 0), coalesce(v_total_lk, 0), now())
  on conflict (user_id) do update set
    genre_scores          = excluded.genre_scores,
    tag_scores            = excluded.tag_scores,
    avg_sentence_length   = excluded.avg_sentence_length,
    prefers_short         = excluded.prefers_short,
    total_underlines      = excluded.total_underlines,
    total_likes           = excluded.total_likes,
    computed_at           = excluded.computed_at;
end;
$$;

-- ====================================
-- 트리거: 밑줄 추가/삭제 시 프로파일 재계산
-- ====================================
create or replace function public.trg_recompute_on_underline()
returns trigger language plpgsql security definer as $$
begin
  perform public.recompute_taste_profile(
    case when TG_OP = 'DELETE' then OLD.user_id else NEW.user_id end
  );
  return null;
end;
$$;

create trigger trg_taste_on_underline
after insert or delete on public.underlines
for each row execute function public.trg_recompute_on_underline();

-- ====================================
-- 트리거: 좋아요 추가/삭제 시 프로파일 재계산
-- ====================================
create or replace function public.trg_recompute_on_like()
returns trigger language plpgsql security definer as $$
begin
  perform public.recompute_taste_profile(
    case when TG_OP = 'DELETE' then OLD.user_id else NEW.user_id end
  );
  return null;
end;
$$;

create trigger trg_taste_on_like
after insert or delete on public.likes
for each row execute function public.trg_recompute_on_like();
