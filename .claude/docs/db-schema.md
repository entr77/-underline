# DB 스키마

Supabase PostgreSQL 기반. 모든 테이블에 RLS(Row Level Security) 적용.

## 테이블 구조

### users
Supabase Auth 확장 프로필. auth.users INSERT 시 트리거로 자동 생성.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | auth.users(id) 참조 |
| username | text UNIQUE | 닉네임 |
| bio | text | 자기소개 |
| occupation | text | 직업 |
| avatar_url | text | 프로필 이미지 URL |
| created_at | timestamptz | 가입일 |
| updated_at | timestamptz | 수정일 (트리거 자동 갱신) |

### books
카카오 도서 API 기반. kakao_id로 upsert.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 내부 ID |
| kakao_id | text UNIQUE | 카카오 도서 ID |
| title | text | 책 제목 |
| author | text | 저자 |
| publisher | text | 출판사 |
| cover_url | text | 표지 이미지 URL |
| isbn | text | ISBN |
| genre | text | 장르 |
| created_at | timestamptz | 등록일 |

### underlines
핵심 테이블. 밑줄 친 문장 저장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 내부 ID |
| user_id | uuid FK | users(id) 참조, CASCADE 삭제 |
| book_id | uuid FK | books(id) 참조, CASCADE 삭제 |
| content | text | 밑줄 친 문장 |
| tags | text[] | 감성 태그 (성장, 위로, 인생 등) |
| page_number | integer | 페이지 번호 (OCR 자동 추출) |
| image_url | text | 촬영 이미지 URL (Supabase Storage) |
| is_public | boolean | 공개 여부 (기본값: true) |
| like_count | integer | 좋아요 수 (트리거 자동 동기화) |
| card_style | text | 카드 스타일 |
| card_bg | text | 카드 배경 |
| card_bg_url | text | 카드 배경 URL (color/gradient 값) |
| card_font | text | 카드 폰트 |
| card_align | text | 카드 텍스트 정렬 |
| card_valign | text | 카드 수직 정렬 |
| card_animation | text | 카드 애니메이션 |
| book_display | text | 책 정보 표시 방식 |
| created_at | timestamptz | 작성일 |
| updated_at | timestamptz | 수정일 (트리거 자동 갱신) |

### likes
좋아요. (user_id, underline_id) 복합 PK로 중복 방지.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid FK | users(id) 참조 |
| underline_id | uuid FK | underlines(id) 참조 |
| created_at | timestamptz | 좋아요 일시 |

### user_taste_profiles
행동 기반 취향 프로파일. 밑줄/좋아요 트리거로 자동 집계.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid PK | users(id) 참조 |
| genre_scores | jsonb | 장르별 밑줄 수 `{"소설": 5, "에세이": 3}` |
| tag_scores | jsonb | 태그별 점수 (밑줄×1.0 + 좋아요×1.5) |
| avg_sentence_length | integer | 평균 밑줄 문장 길이 |
| prefers_short | boolean | 짧은 문장 선호 여부 |
| total_underlines | integer | 총 밑줄 수 |
| total_likes | integer | 총 좋아요 수 |
| computed_at | timestamptz | 마지막 집계 시점 |

## RLS 정책

| 테이블 | 작업 | 정책 |
|--------|------|------|
| users | SELECT | 누구나 |
| users | UPDATE | 본인만 (auth.uid() = id) |
| books | SELECT | 누구나 |
| books | INSERT/UPDATE | 인증된 사용자 |
| underlines | SELECT | 공개(is_public=true) 또는 본인 |
| underlines | INSERT/UPDATE/DELETE | 본인만 |
| likes | SELECT | 누구나 |
| likes | INSERT/DELETE | 본인만 |
| user_taste_profiles | SELECT | 누구나 |
| user_taste_profiles | INSERT/UPDATE | 트리거(security definer)만 — 앱 코드 직접 쓰기 금지 |

## 트리거

- **trg_on_auth_user_created**: auth.users INSERT → public.users 행 자동 생성
- **trg_like_count**: likes INSERT/DELETE → underlines.like_count 자동 동기화
- **trg_users_updated_at / trg_underlines_updated_at**: UPDATE 시 updated_at 자동 갱신
- **trg_taste_on_underline**: underlines INSERT/DELETE → recompute_taste_profile() 호출
- **trg_taste_on_like**: likes INSERT/DELETE → recompute_taste_profile() 호출

## Storage

- 버킷: **underline-images** (public)
- 업로드 경로: `{user_id}/{timestamp}.{ext}`
- 정책: 본인만 업로드/삭제, 누구나 조회

## 마이그레이션 파일

| 파일 | 내용 |
|------|------|
| 001_initial_schema.sql | 전체 테이블, RLS, 트리거 |
| 002_storage.sql | underline-images 버킷 + RLS |
| 003_books_update_policy.sql | books UPDATE RLS |
| 004_users_occupation.sql | users.occupation 컬럼 추가 |
| 005~012 | 카드 스타일 관련 컬럼 추가 |
| 008_books_genre.sql | books.genre 컬럼 추가 |
| 009_underline_tags.sql | underlines.tags 컬럼 + GIN 인덱스 |
| 013_user_taste_profiles.sql | user_taste_profiles 테이블 + 트리거 |
| 014_taste_profile_public_rls.sql | 취향 프로파일 공개 조회 허용 |
| 015_drop_users_tags.sql | users.tags 컬럼 제거 (행동 기반으로 대체) |

## 주의사항

- books upsert는 반드시 service role key(Admin Client)로 실행 — anon key로는 UPDATE RLS에 막힘
- PostgREST join 시 관계 명시 필요: `users!underlines_user_id_fkey` (PGRST201 방지)
- user_taste_profiles는 앱 코드에서 직접 INSERT/UPDATE 금지 — 트리거가 관리
- 신규 auth.users는 트리거로 자동 생성되지만, 마이그레이션 이전 계정은 수동 INSERT 필요
