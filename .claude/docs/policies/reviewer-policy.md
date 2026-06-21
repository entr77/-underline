# Reviewer 심화 정책 — 밑줄 서비스

> 대상: Reviewer 에이전트
> 참조 기반: `reviewer.md`, `001_initial_schema.sql` ~ `012_card_animation.sql`, 실제 Route Handler 코드
> 갱신 시 Confluence UI/UX 설계 페이지(ID: 360619)도 함께 업데이트

---

## 1. 소셜 독서 앱 보안 체크리스트 (밑줄 특화)

### 1-1. IDOR 취약점 — 비공개 밑줄 타인 접근 시나리오별 점검

밑줄 테이블은 `is_public` 컬럼으로 공개/비공개를 제어한다. 아래 시나리오를 순서대로 점검한다.

**시나리오 A — 피드 목록 노출**
- [ ] `/feed` 쿼리에서 `is_public = true` 필터가 Supabase 쿼리 레벨에 존재하는가?
  - 클라이언트 측에서 JS로만 필터링하면 통과. DB 쿼리 자체에 `.eq('is_public', true)` 가 있어야 한다.
- [ ] `select * from underlines` 처럼 전체 조회 후 JS 필터 패턴은 P0 버그다.

**시나리오 B — 상세 페이지 직접 접근**
- [ ] `/underline/[id]` 서버 컴포넌트에서 `is_public = true OR auth.uid() = user_id` 조건으로 조회하는가?
- [ ] RLS가 켜진 anon 세션으로 비공개 밑줄 ID를 직접 요청했을 때 404(또는 403)가 반환되는가?
  - 검증 쿼리: `select * from underlines where id = '<비공개 id>'` — anon key로 실행 → 결과 없음이어야 함

**시나리오 C — 프로필 페이지 (`/profile/[username]`)**
- [ ] 타인의 프로필에서 내 비공개 밑줄이 보이지 않는가?
- [ ] 프로필 조회 쿼리에 `is_public = true` 필터가 반드시 포함되어 있는가?
  - 예외: 본인 프로필 (`auth.uid() = user_id`) 에서는 비공개 포함 허용

**시나리오 D — 책 페이지 (`/book/[id]`)**
- [ ] 특정 책의 밑줄 목록 조회 시 비공개 밑줄이 포함되지 않는가?
- [ ] 히트맵 집계 쿼리 (`count by page_number`) 에도 `is_public = true` 필터가 있는가?
  - 히트맵은 합산 숫자만 보이므로 놓치기 쉬운 지점이다.

**시나리오 E — 검색/태그 필터**
- [ ] 태그 기반 피드 필터 (`/feed?tag=...`) 에서도 `is_public = true` 조건이 유지되는가?

---

### 1-2. /api/ Route Handler 인증 검증 체크리스트

| 엔드포인트 | 인증 필요 여부 | 현재 체크 방법 | 점검 항목 |
|---|---|---|---|
| `POST /api/vision/analyze` | 비인증도 호출 가능 (현재 설계) | — | [ ] 요청당 비용($) 발생 — rate limit 없으면 남용 가능 |
| `POST /api/vision/highlight` | 비인증 가능 | — | 위와 동일 |
| `POST /api/vision/book` | 비인증 가능 | — | 위와 동일 |
| `POST /api/vision/page` | 비인증 가능 | — | 위와 동일 |
| `GET /api/books/search` | 비인증 가능 | — | [ ] `q` 파라미터 XSS 가능성 없는가? (서버측 API 호출이므로 낮음, 확인만) |
| `POST /api/images/upload-bg` | 인증 필요 | `supabase.auth.getUser()` 체크 있음 | [ ] 이미지 타입 검증만 있고 확장자 위조 가능성은? |
| `GET /api/proxy-image` | 비인증 가능 | — | [ ] SSRF 위험 — 내부 IP/도메인으로 요청 가능한가? |

**인증 체크 패턴 검증:**
```typescript
// 올바른 패턴 (server-side supabase)
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "..." }, { status: 401 });

// 위험 패턴 — JWT 검증 없이 body의 user_id를 그대로 신뢰
const { user_id } = await request.json(); // 절대 금지
```

- [ ] 모든 데이터 변경 Route Handler (`POST`, `PUT`, `DELETE`)에 `auth.getUser()` 체크가 있는가?
- [ ] `createAdminClient()`(service role key)를 사용하는 경우, 반드시 인증 확인 후에만 사용하는가?
  - `upload-bg/route.ts`의 `createAdminClient()` 호출은 인증 확인 이후에 위치하므로 현재 올바름.

---

### 1-3. 클라이언트 번들 API 키 노출 감지 방법

**즉시 실행 가능한 점검 명령:**
```bash
# 빌드 아티팩트에서 API 키 패턴 검색
grep -r "KAKAO_REST_API_KEY\|GOOGLE_CLOUD_VISION_API_KEY\|SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY" .next/ 2>/dev/null

# "use client" 파일에서 process.env 사용 검색 (NEXT_PUBLIC_ 제외)
grep -rn "process\.env\." src/ --include="*.tsx" --include="*.ts" | grep -v "NEXT_PUBLIC_" | grep -v "//.*process"
```

**점검 규칙:**
- [ ] `NEXT_PUBLIC_` 접두사 없는 환경변수가 `"use client"` 파일에서 참조되지 않는가?
- [ ] `KAKAO_REST_API_KEY`는 `/api/books/search/route.ts` 서버에서만 사용되는가?
- [ ] `GOOGLE_CLOUD_VISION_API_KEY`는 `src/lib/vision/orchestrator.ts` (서버 전용)에서만 사용되는가?
- [ ] `ANTHROPIC_API_KEY`는 `src/lib/vision/client.ts` (서버 전용)에서만 사용되는가?
- [ ] `SUPABASE_SERVICE_ROLE_KEY`는 `createAdminClient()` 내부에서만 참조되는가?

---

### 1-4. XSS — 유저 입력 책 문장 렌더링 안전성

밑줄 `content` 필드는 유저가 OCR 결과를 수동 수정할 수 있어 XSS 표면이 된다.

**점검 항목:**
- [ ] `UnderlineCard`, `underline/[id]` 상세 페이지에서 `content`를 `dangerouslySetInnerHTML`로 렌더링하지 않는가?
- [ ] `innerHTML = content` 패턴이 없는가?
- [ ] React의 기본 JSX 렌더링(`{content}`)은 자동 이스케이프되므로 안전 — 이 방식을 사용하고 있는가?
- [ ] 책 제목(`title`), 저자명(`author`) 등 카카오 API 응답 필드도 JSX로만 렌더링하는가?
- [ ] `src/app/share-card/` 또는 이미지 카드 생성 과정에서 canvas/svg에 문자열을 직접 주입하는 경우, HTML 이스케이프가 적용되어 있는가?

---

## 2. Supabase RLS 심화 검증 가이드

### 2-1. 테스트 준비

Supabase SQL Editor에서 아래 함수로 특정 유저 역할로 실행 컨텍스트를 설정할 수 있다.

```sql
-- anon(비인증) 역할로 테스트
SET ROLE anon;

-- 특정 유저로 테스트 (JWT 없이 uid 직접 지정)
SET request.jwt.claims TO '{"sub": "<user_id>", "role": "authenticated"}';
SET ROLE authenticated;

-- 테스트 후 리셋
RESET ROLE;
```

---

### 2-2. underlines is_public 필터링 검증

**목표**: anon 사용자는 `is_public = true`인 밑줄만 볼 수 있어야 한다.

```sql
-- 테스트 1: anon이 비공개 밑줄에 직접 접근 (결과 없어야 함)
SET ROLE anon;
SELECT id, content, is_public
FROM public.underlines
WHERE is_public = false
LIMIT 5;
-- 기대 결과: 0 rows

-- 테스트 2: anon이 전체 조회 시 공개 밑줄만 반환 (비공개 포함 시 P0 버그)
SELECT id, is_public FROM public.underlines LIMIT 20;
-- 기대 결과: 모든 row의 is_public = true

-- 테스트 3: 본인(authenticated)은 자신의 비공개 밑줄에 접근 가능
SET request.jwt.claims TO '{"sub": "<본인 user_id>", "role": "authenticated"}';
SET ROLE authenticated;
SELECT id, is_public FROM public.underlines WHERE user_id = '<본인 user_id>';
-- 기대 결과: is_public = false인 row도 포함되어 나와야 함

RESET ROLE;
```

**현재 RLS 정책 (`001_initial_schema.sql`):**
```sql
create policy "공개 밑줄은 누구나 조회" on public.underlines
  for select using (is_public = true or auth.uid() = user_id);
```
- `is_public = true OR auth.uid() = user_id` — 이 조건이 그대로 유지되어야 한다.
- 향후 마이그레이션에서 이 정책이 `DROP POLICY` 후 재생성될 경우 조건 변경 여부를 반드시 확인한다.

---

### 2-3. likes 본인 데이터만 삭제 검증

**목표**: 타인의 좋아요를 삭제할 수 없어야 한다.

```sql
-- 테스트: 유저 A가 유저 B의 좋아요를 삭제 시도 (0 rows affected여야 함)
SET request.jwt.claims TO '{"sub": "<유저A id>", "role": "authenticated"}';
SET ROLE authenticated;

DELETE FROM public.likes
WHERE user_id = '<유저B id>'  -- 타인의 좋아요
  AND underline_id = '<임의 id>';
-- 기대 결과: DELETE 0 (RLS가 막아야 함)

RESET ROLE;

-- 확인: 실제로 삭제됐는지 체크
SELECT COUNT(*) FROM public.likes WHERE user_id = '<유저B id>';
```

**주의**: `sync_like_count` 트리거는 `security definer`로 실행되므로 RLS 우회 여부 확인 필요.
- [ ] 트리거는 `likes` 테이블 DELETE 후 동작하므로, RLS가 DELETE 자체를 막으면 트리거 미실행 — 의도된 동작
- [ ] `security definer` 함수가 RLS를 우회해서 `underlines.like_count`를 직접 수정하는 것은 안전 (like_count는 집계값이므로 조작 가능성 없음)

---

### 2-4. users 타인 프로필 업데이트 차단 검증

```sql
-- 테스트: 유저 A가 유저 B의 프로필을 수정 시도 (0 rows affected여야 함)
SET request.jwt.claims TO '{"sub": "<유저A id>", "role": "authenticated"}';
SET ROLE authenticated;

UPDATE public.users
SET bio = 'hacked'
WHERE id = '<유저B id>';
-- 기대 결과: UPDATE 0

RESET ROLE;
```

**추가 확인 — username 탈취 시나리오:**
```sql
-- 유저 A가 유저 B의 username을 자신의 것으로 변경 시도
SET request.jwt.claims TO '{"sub": "<유저A id>", "role": "authenticated"}';
SET ROLE authenticated;

UPDATE public.users
SET username = '<유저B의 username>'
WHERE id = '<유저A id>';
-- 기대 결과: UNIQUE constraint 위반 오류 발생 (정상)
```

- [ ] `users` 테이블에 `username UNIQUE` 제약이 존재하는가? (`001_initial_schema.sql` 확인 — 존재함)
- [ ] `handle_new_user()` 트리거에서 중복 username 처리: `on conflict (id) do nothing` — id 중복은 막지만 username 중복은 `split_part(email, '@', 1)`이 동일하면 가입 실패 가능. 온보딩에서 username 변경 단계가 있는지 확인.

---

### 2-5. Storage RLS 검증 (`002_storage.sql`)

```sql
-- 테스트: 유저 A가 유저 B 폴더에 업로드 시도
-- Storage 정책: auth.uid()::text = split_part(name, '/', 1)
-- 즉 파일 경로의 첫 번째 세그먼트가 본인 uid여야 함

-- 검증: card-bg/ 경로 업로드 (upload-bg route.ts)에서 path 생성 방식 확인
-- path = `card-bg/${user.id}-${Date.now()}.${ext}`
-- → 첫 번째 세그먼트가 'card-bg' 이므로 Storage RLS 정책과 충돌 가능성 있음
```

> **주의**: `upload-bg/route.ts`에서 `card-bg/<user_id>-<ts>.<ext>` 형식으로 저장 시,
> Storage 정책 `split_part(name, '/', 1) = auth.uid()::text`는 `card-bg != <uid>`이므로 **RLS 차단됨**.
> 현재 `createAdminClient()`(service role key)로 업로드하므로 RLS를 우회 — 의도된 설계이나,
> 향후 일반 클라이언트로 변경 시 경로 구조를 `<user_id>/card-bg/<ts>.<ext>`로 변경해야 한다.
> - [ ] 이 동작이 문서화되어 있는지 확인. 변경 시 기존 파일 경로 마이그레이션 필요.

---

## 3. 성능 리뷰 체크리스트

### 3-1. 피드 쿼리 N+1 패턴 감지

**N+1 발생 패턴:**
```typescript
// 위험 패턴: 밑줄 목록을 가져온 후 각각 책/유저 정보를 별도 쿼리
const underlines = await supabase.from('underlines').select('*');
for (const u of underlines.data) {
  const user = await supabase.from('users').select('*').eq('id', u.user_id); // N+1
  const book = await supabase.from('books').select('*').eq('id', u.book_id); // N+1
}

// 올바른 패턴: 관계 조인으로 한 번에 조회
const underlines = await supabase
  .from('underlines')
  .select('*, users(*), books(*)')
  .eq('is_public', true)
  .order('created_at', { ascending: false });
```

**감지 방법:**
- [ ] 피드/목록 페이지 서버 컴포넌트에서 반복문 내부에 `await supabase.from(...)` 호출이 있는가?
- [ ] `Promise.all`로 병렬화되더라도 N개의 쿼리가 발생하면 N+1로 간주한다.
- [ ] Supabase `select` 쿼리에 관계 조인(`users(*)`, `books(*)`)이 포함되어 있는가?

**`likes` 테이블 N+1 특이 케이스:**
- 피드에서 `like_count`는 `underlines` 테이블에 비정규화되어 있으므로 별도 쿼리 불필요 — 올바른 설계.
- 로그인 유저의 좋아요 여부(`has_liked`)는 `likes` 테이블 조회가 필요. 밑줄별로 따로 쿼리하면 N+1.
  - 올바른 패턴: 현재 유저의 좋아요 목록을 한 번에 가져와 Set으로 변환 후 in-memory 조회.

---

### 3-2. 불필요한 `"use client"` 감지 기준

**`"use client"` 추가가 필요한 경우만 허용:**
- `useState`, `useEffect`, `useRef`, `useContext` 등 React Hook 사용
- 브라우저 이벤트 핸들러 (`onClick`, `onChange`, `onSubmit`)
- 브라우저 전용 API (`window`, `navigator`, `document`)
- `useRouter`, `useSearchParams`, `usePathname` 등 클라이언트 전용 Next.js Hook

**점검:**
- [ ] `"use client"` 파일에서 위 항목 중 하나도 사용하지 않는 파일이 있는가?
- [ ] 데이터 페칭만 하는 컴포넌트에 `"use client"`가 붙어 있는가? → Server Component로 변환
- [ ] 부모가 `"use client"`라는 이유로 하위 컴포넌트 전체에 전파된 경우: 인터랙션 부분만 분리해 Client Component로

**감지 명령:**
```bash
grep -rn '"use client"' src/components/ui/ src/app/ --include="*.tsx" | wc -l
# 숫자가 전체 tsx 파일의 30% 이상이면 과도한 클라이언트화 의심
```

---

### 3-3. Supabase 쿼리 인덱스 미사용 패턴

현재 정의된 인덱스 (`001_initial_schema.sql`):
```sql
create index on public.underlines(user_id);
create index on public.underlines(book_id);
create index on public.underlines(created_at desc);
create index on public.underlines(is_public, created_at desc); -- 복합 인덱스
create index on public.likes(underline_id);
create index on public.underlines USING GIN (tags); -- 009_underline_tags.sql
```

**인덱스 미사용 의심 패턴:**
- [ ] `WHERE` 없는 전체 테이블 스캔: `.from('underlines').select('*')`
- [ ] `is_public` 단독 필터: 복합 인덱스 `(is_public, created_at desc)` 활용 — `ORDER BY created_at DESC`를 함께 써야 인덱스 효과 최대
- [ ] 배열 컬럼 tags 검색: `.contains('tags', ['소설'])` → GIN 인덱스 활용됨 (올바름), `.like('tags', ...)` → 인덱스 미사용 (위험)
- [ ] `OR` 조건 (`is_public = true OR user_id = ?`): RLS에 있으므로 쿼리 플래너가 처리 — 성능 이슈 시 부분 인덱스 추가 검토

**신규 마이그레이션 리뷰 시:**
- [ ] 새 `WHERE` 절에 사용되는 컬럼에 인덱스가 없는가?
- [ ] `card_style`, `card_animation` 등 카드 스타일 컬럼은 WHERE 필터로 쓰지 않으므로 인덱스 불필요 — 추가 금지 (과도한 인덱스는 write 성능 저하)

---

## 4. Vision API 리뷰 기준

### 4-1. API 호출 전 이미지 크기 제한 검증

현재 Vision 분석 엔드포인트(`POST /api/vision/analyze`)에는 크기 제한 코드가 없다.

**점검:**
- [ ] `imageBase64` 문자열 길이 체크가 있는가? (없으면 수십 MB 이미지로 DoS 가능)
  - Base64 인코딩 비율: 원본 1MB → base64 약 1.37MB
  - 제안 제한: 원본 10MB → base64 최대 ~14MB (약 14,000,000 chars)
- [ ] `upload-bg/route.ts`의 `file.size > 10 * 1024 * 1024` 제한은 파일 업로드에만 적용 — Vision 분석 경로는 별도 체크 필요

**제안 가드레일 코드 패턴:**
```typescript
const MAX_BASE64_LENGTH = 14_000_000; // ~10MB 원본
if (imageBase64.length > MAX_BASE64_LENGTH) {
  return NextResponse.json({ error: "이미지가 너무 큽니다. 10MB 이하로 줄여주세요." }, { status: 413 });
}
```

- [ ] Google Cloud Vision API 요청도 이미지 크기 제한 확인:
  - Google Vision API 단일 이미지 base64 제한: **10MB** (초과 시 `INVALID_ARGUMENT`)
  - Claude API 이미지 제한: **5MB** (초과 시 에러)
  - 따라서 실질적 제한은 Claude의 5MB — base64로 약 7MB

---

### 4-2. AI 응답 신뢰도 낮을 때 폴백 처리 여부

**orchestrator.ts 현재 폴백 체인:**
```
Google Vision OCR → 실패 시 Claude OCR fallback
책 식별: header → footer → claude-text → claude-multi → google-books → claude-image
밑줄 감지: Claude Vision 단독 (폴백 없음)
```

**점검:**
- [ ] `bookCandidates` 배열이 비어있을 때 `book = null`로 처리하는가? — 현재 코드에서 확인됨 (올바름)
- [ ] Claude OCR 응답 파싱 실패 시 `throw new Error(...)` — 이 에러가 최종 사용자에게 어떻게 전달되는가?
  - `/api/vision/analyze`에서 `catch` 블록이 `502`를 반환하므로 사용자에게 "이미지 분석 실패" 메시지 노출 — 올바름
- [ ] `pageNumberResult.confidence`가 `"low"`일 때 UI에서 "자동 인식 실패, 직접 입력하세요" 안내가 나타나는가?
- [ ] Claude 응답에서 JSON 파싱 실패 시 빈 결과(`{}`) 대신 에러를 throw하는가? — 현재 `extractOcrClaude`에서 `throw new Error("Claude OCR 응답 파싱 실패")`로 처리 중 (올바름)
- [ ] 밑줄 감지 결과 `segments: []` (아무것도 감지 안 됨)일 때 UI에서 "감지된 밑줄이 없습니다. 직접 선택하세요" 안내가 있는가?

---

### 4-3. 비용 관련 가드레일

Vision 관련 주요 비용 발생 지점:

| 호출 | 예상 비용 | 현재 가드레일 |
|---|---|---|
| Claude claude-sonnet-4-6 OCR (fallback) | ~$0.003/이미지 | 인증 없음 |
| Claude claude-sonnet-4-6 밑줄 감지 | ~$0.003/이미지 | 인증 없음 |
| Claude claude-sonnet-4-6 책 식별 (claude-multi) | ~$0.003/이미지 | 인증 없음 |
| Google Cloud Vision | $1.50/1000 calls | 인증 없음 |

**점검:**
- [ ] `/api/vision/*` 엔드포인트에 인증 체크가 없다 — 비인증 호출로 비용 발생 가능
  - 권고: `POST /api/vision/analyze` 에 `auth.getUser()` 체크 추가 (P1)
  - 단기 대안: Vercel Edge Config 또는 미들웨어로 rate limit 적용
- [ ] 동일 이미지의 반복 분석 요청 방지 로직이 있는가? (이미지 해시 기반 캐시)
- [ ] Vercel 함수 타임아웃 설정 확인: Vision + 책 식별 병렬 호출 시 총 소요 시간이 60초(Vercel Pro 기본)를 초과할 수 있음
  - [ ] `route.ts`에 `export const maxDuration = 60;` 설정이 있는가?

---

## 5. 배포 전 최종 체크리스트

### 5-1. 환경변수 누락 감지

**필수 환경변수 목록** (`CLAUDE.md` 기준):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
KAKAO_REST_API_KEY
GOOGLE_CLOUD_VISION_API_KEY
ANTHROPIC_API_KEY       ← vision/orchestrator에서 사용, .env.local에만 있을 수 있음
CONFLUENCE_API_TOKEN    ← 에이전트 전용, Vercel 배포에는 불필요
```

**감지 방법:**
```bash
# .env.local에 정의된 키 목록 확인 (값 노출 안 함)
grep -v "^#" .env.local | grep "=" | cut -d= -f1

# Vercel 환경변수 확인 (CLI)
vercel env ls

# 코드에서 참조하는 환경변수 목록 추출
grep -rn "process\.env\." src/ --include="*.ts" --include="*.tsx" | grep -oP "process\.env\.\K[A-Z_]+" | sort -u
```

- [ ] 위 두 목록(코드 참조 vs Vercel 설정)을 비교해 누락된 키가 없는가?
- [ ] `ANTHROPIC_API_KEY`가 Vercel 환경변수에 설정되어 있는가? (빌드 성공해도 런타임에 Vision 분석 실패)

---

### 5-2. 마이그레이션 누락 감지

**마이그레이션 파일 번호 일관성 확인:**
```
현재 파일: 001~012 + 009_underline_tags.sql (번호 충돌)
009_card_font.sql  ← 이미 009 번호 사용
009_underline_tags.sql  ← 같은 번호 충돌 → 실제 적용 순서 불명확
```

- [ ] `supabase/migrations/` 폴더에 번호 중복 파일이 없는가? — **현재 `009` 번호 충돌 존재** (P1)
  - `009_underline_tags.sql`을 `013_underline_tags.sql`로 리네임 필요
- [ ] 코드에서 사용하는 컬럼(`tags`, `card_animation`, `card_bg`, `card_font`, `card_align`, `card_valign`, `card_style`)이 모두 마이그레이션에 존재하는가?
- [ ] Supabase 대시보드에서 실제 테이블 스키마와 마이그레이션 파일이 일치하는가?

**배포 전 필수 쿼리:**
```sql
-- 실제 테이블 컬럼 목록 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'underlines'
ORDER BY ordinal_position;
```

---

### 5-3. console.log / 하드코딩 URL 감지

```bash
# console.log 전수 검색 (테스트 코드 제외)
grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."

# 하드코딩 URL 검색 (localhost, 특정 도메인)
grep -rn "localhost\|127\.0\.0\.1\|http://underline\|https://underline" src/ --include="*.ts" --include="*.tsx"

# 하드코딩 색상값 (디자인 토큰 우회)
grep -rn "#[0-9a-fA-F]\{3,6\}" src/components/ --include="*.tsx" | grep -v "globals.css\|tailwind"
```

**기준:**
- `console.log` — 개발 편의용은 배포 전 제거. `console.error`는 에러 추적용이므로 유지 가능.
- Vision 파이프라인의 `console.log("[OCR] Google Vision 완료 ...")` — 운영 비용 모니터링에 유용. 유지 허용.
- `localhost` 하드코딩 — P0 버그 (프로덕션에서 동작 안 함)
- 하드코딩 색상값 (`#1C1917` 등) — `var(--color-ink)` 또는 Tailwind 클래스로 교체 권고 (P2)

---

## 6. 리뷰 우선순위 기준

### 6-1. P0 — 배포 블로커 (즉시 수정, 배포 중단)

아래 중 하나라도 해당하면 배포를 막는다.

| 유형 | 예시 |
|---|---|
| 비공개 데이터 노출 | anon 쿼리로 `is_public = false` 밑줄 접근 가능 |
| API 키 클라이언트 노출 | `KAKAO_REST_API_KEY`가 번들에 포함 |
| 인증 우회 | 인증 없이 타인의 밑줄 삭제 가능 |
| 하드코딩 localhost | 프로덕션 API 호출이 `localhost:3000`으로 향함 |
| RLS 비활성화 | 테이블에 `disable row level security` 실행됨 |
| Service role key 클라이언트 노출 | `SUPABASE_SERVICE_ROLE_KEY`가 브라우저에 전달 |

### 6-2. P1 — 수정 권장 (다음 PR 전 수정)

| 유형 | 예시 |
|---|---|
| Vision API 인증 없음 | 비인증 호출로 비용 발생 가능 |
| N+1 쿼리 | 피드에서 밑줄 50개 × 별도 users 쿼리 50회 |
| 이미지 크기 무제한 | base64 100MB 이미지로 Vision API 에러 유발 |
| 마이그레이션 번호 충돌 | `009_card_font.sql` / `009_underline_tags.sql` 중복 |
| maxDuration 미설정 | Vision 분석이 Vercel 함수 타임아웃(10초 기본) 초과 |
| SSRF 미방어 | `proxy-image` 엔드포인트에서 내부 IP 차단 없음 |

### 6-3. P2 — 선택적 개선 (백로그에 추가)

| 유형 | 예시 |
|---|---|
| 하드코딩 색상값 | 컴포넌트에서 `#1C1917` 직접 사용 |
| 불필요한 `"use client"` | 인터랙션 없는 컴포넌트에 클라이언트 지시어 |
| console.log 잔존 | OCR 디버그 로그 외 일반 console.log |
| 타입 `any` 사용 | `response: any`로 카카오 API 응답 처리 |
| 인덱스 추가 제안 | 새 필터 컬럼에 인덱스 없음 |

---

### 6-4. 지적 안 해도 되는 케이스 (오버엔지니어링 방지)

아래 항목은 리뷰에서 지적하지 않는다.

| 패턴 | 이유 |
|---|---|
| Server Component에서 데이터 페칭을 직접 수행 | Next.js App Router 권장 패턴 |
| Supabase 쿼리 빌더 체이닝 | 가독성 vs 성능 트레이드오프 없음 |
| `like_count` 비정규화 | 읽기 성능 최적화 의도된 설계 |
| 테마별 CSS 조건문이 길어짐 | 카드 테마가 6종이므로 switch/if 필연적 |
| 마이그레이션 파일이 잘게 분리됨 | 각 컬럼 추가가 독립 파일 — 롤백 편의성 우선 |
| Vision OCR에 `console.log` 유지 | 운영 비용 추적 목적, 의도된 로그 |
| `"use client"` + `useState`가 있는 폼 컴포넌트 | 인터랙션이 있는 폼은 클라이언트 필수 |
| Tailwind 클래스가 길어짐 | `cn()`으로 정리 권고는 P2, 기능에 영향 없음 |
| 카카오 API 응답 캐시 `revalidate: 60` | 60초 캐시는 API 비용 절감 의도된 설계 |
| `admin.storage.from(...).upload` 경로에 user.id 포함 | service role로 업로드하므로 RLS 우회 — 의도된 설계 |
