# Developer 심화 정책 — 밑줄 서비스

> 최종 업데이트: 2026-06-22
> 이 문서는 codebase를 직접 분석한 결과를 반영한다.
> `CLAUDE.md` → `dev-routine.md` → 이 문서 순서로 우선순위 적용.

---

## 1. Next.js 15 App Router 필수 패턴

### Server Component vs Client Component 판단 기준

**Server Component 기본 원칙**: 데이터를 읽기만 하고 상태·이벤트가 없으면 무조건 Server Component.

| 조건 | 선택 | 예시 |
|------|------|------|
| Supabase에서 데이터 fetch | Server | `FeedPage`, `BookDetailPage`, `ProfilePage` |
| `useState`, `useEffect` 사용 | Client | `LikeButton`, `BookSearchInput`, `ImageCropRotate` |
| 이벤트 핸들러 (`onClick` 등) | Client | `DeleteUnderlineButton`, `ShareCardButton` |
| `useRouter`, `useTransition` 사용 | Client | `LikeButton` (optimistic update) |
| URL searchParams 읽기만 할 때 | Server | `FeedPage` (`searchParams` prop) |
| URL searchParams 변경 (라우터) | Client | `FeedFilter` |
| 카메라/파일 접근 | Client | `/new` 페이지 전체 (`"use client"`) |

**실제 코드 패턴** — `/new/page.tsx`는 멀티스텝 상태 기계가 필요하므로 파일 최상단에 `"use client"` 선언. 반면 `FeedPage`는 async Server Component로 Supabase 직접 쿼리.

```tsx
// Server Component — 데이터 fetch + 렌더링
export default async function FeedPage({ searchParams }: Props) {
  const { tag } = await searchParams; // Next.js 15에서 searchParams는 Promise
  const supabase = await createClient(); // server.ts 클라이언트
  const { data } = await supabase.from("underlines").select("...");
  return <div>...</div>;
}

// Client Component — 인터랙션 필요
"use client";
export default function LikeButton({ underlineId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();
  // ...
}
```

**Next.js 15 주의**: `params`와 `searchParams`는 모두 `Promise<...>` 타입. `await`하지 않으면 타입 에러 발생.

```tsx
// 올바른 방법
type Props = { params: Promise<{ id: string }> };
export default async function Page({ params }: Props) {
  const { id } = await params;
}
```

### Route Handler 응답 형식 표준

모든 Route Handler는 `NextResponse.json()`을 사용한다. 응답 구조를 아래로 통일한다.

```ts
// 성공
return NextResponse.json(data); // 200

// 클라이언트 에러 (잘못된 요청)
return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });

// 인증 실패
return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

// 서버 설정 에러 (API 키 없음)
return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });

// 외부 API 실패 (upstream)
return NextResponse.json({ error: "이미지 분석 실패", detail: String(error) }, { status: 502 });
```

**에러 필드**: 항상 `error` (한국어 설명) + 선택적으로 `detail` (디버깅용 원본 에러 메시지).

**인증 체크 패턴** (Server Action 기준):

```ts
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return { error: "로그인이 필요합니다." };
```

Route Handler에서는 `return NextResponse.json({ error: "..." }, { status: 401 })`.

### next/image 사용 필수 케이스

| 케이스 | 필수 여부 | 이유 |
|--------|----------|------|
| 책 표지 (`cover_url`) | **필수** | 카카오 CDN 이미지, 최적화 + lazy load 필요 |
| 유저 업로드 이미지 (`image_url`) | **필수** | Supabase Storage, WebP 변환 + blur placeholder |
| 아바타 (`avatar_url`) | **필수** | 작은 크기지만 목록에서 반복 렌더링 |
| Unsplash 검색 이미지 (scene 테마) | **필수** | 외부 도메인 이미지 최적화 |
| SVG 아이콘, 인라인 이미지 | 불필요 | `<img>` 또는 인라인 SVG 사용 가능 |

```tsx
import Image from "next/image";

// 책 표지 — 고정 크기
<Image
  src={book.cover_url}
  alt={book.title}
  width={60}
  height={88}
  className="object-cover rounded"
/>

// 유저 업로드 이미지 — fill 모드
<div className="relative aspect-square">
  <Image
    src={underline.image_url}
    alt="책 페이지"
    fill
    className="object-cover"
    sizes="(max-width: 430px) 100vw, 430px"
  />
</div>
```

**next.config.ts에 허용 도메인 등록 필수**: 카카오 CDN, Supabase Storage, Unsplash는 이미 등록되어 있어야 한다. 새 외부 이미지 소스 추가 시 `images.remotePatterns`에 추가한다.

### Streaming/Suspense 적용 기준

| 상황 | 적용 여부 | 이유 |
|------|----------|------|
| 피드 필터 (`FeedFilter`) | **적용** | searchParams 의존, 독립적 hydration |
| 피드 전체 목록 | 선택 | 데이터 크기에 따라 |
| 책 상세 + 밑줄 목록 | 선택 | 두 쿼리를 분리할 경우 |
| Vision 처리 중 UI | **적용** | 처리 시간 길어 skeleton 필요 |
| 단순 정적 컴포넌트 | 불필요 | 오버헤드만 증가 |

```tsx
// 실제 사용 패턴 (feed/page.tsx)
<Suspense>
  <FeedFilter />
</Suspense>
```

Suspense는 `fallback`을 명시적으로 넣지 않으면 빈 상태로 렌더링된다. 로딩 UI가 필요한 경우 skeleton 컴포넌트를 `fallback`에 전달한다.

---

## 2. Supabase 패턴

### 서버 vs 클라이언트 인스턴스 사용 구분

| 파일 유형 | 사용 클라이언트 | import 경로 |
|----------|--------------|------------|
| Server Component (`page.tsx`) | `createClient()` | `@/lib/supabase/server` |
| Server Action (`actions/*.ts`) | `createClient()` + `createAdminClient()` | `@/lib/supabase/server` |
| Route Handler (`api/*/route.ts`) | `createClient()` 또는 `createAdminClient()` | `@/lib/supabase/server` |
| Client Component (`"use client"`) | `createClient()` | `@/lib/supabase/client` |
| Middleware (`middleware.ts`) | `createServerClient` (직접) | `@/lib/supabase/middleware` |

**핵심 구분**:
- `server.ts`의 `createClient()` → `@supabase/ssr`의 `createServerClient`. 쿠키 기반 세션 읽기. RLS 적용.
- `server.ts`의 `createAdminClient()` → `@supabase/supabase-js`의 `createClient` + `SERVICE_ROLE_KEY`. RLS 우회. **서버에서만**, books upsert / 어드민 작업에만 사용.
- `client.ts`의 `createClient()` → `@supabase/ssr`의 `createBrowserClient`. 브라우저 세션. RLS 적용.

```ts
// Server Action에서 books upsert — adminClient 사용 (RLS 우회 필요)
const adminClient = createAdminClient();
await adminClient.from("books").upsert(
  { kakao_id: "...", title: "..." },
  { onConflict: "kakao_id", ignoreDuplicates: false }
);

// Server Component에서 데이터 읽기 — 일반 createClient (RLS 적용)
const supabase = await createClient();
const { data } = await supabase.from("underlines").select("*");
```

### underlines/likes/users/books 테이블 쿼리 표준 패턴

**underlines — JOIN 쿼리 (피드, 책 상세)**

```ts
// underlines + users + books JOIN (피드)
const { data, error } = await supabase
  .from("underlines")
  .select(`
    *,
    user:users!underlines_user_id_fkey(*),
    book:books(*)
  `)
  .eq("is_public", true)
  .order("created_at", { ascending: false })
  .limit(50);

// books 기준 필터
const { data } = await supabase
  .from("underlines")
  .select("id, content, page_number, image_url, ..., user:users!underlines_user_id_fkey(...)")
  .eq("book_id", id)
  .eq("is_public", true)
  .order("created_at", { ascending: false });
```

**주의**: `user:users(*)` 대신 반드시 `user:users!underlines_user_id_fkey(*)` 형식으로 FK 이름을 명시해야 Supabase가 관계를 정확히 해석한다.

**likes — 좋아요 여부 확인**

```ts
// 현재 유저의 좋아요 목록 (피드 렌더링 전)
const { data: likesData } = await supabase
  .from("likes")
  .select("underline_id")
  .eq("user_id", currentUser.id);

const likedIds = new Set((likesData ?? []).map((l) => l.underline_id));
```

**books — ISBN 기반 upsert**

```ts
// kakao_id를 UNIQUE 키로 upsert
await adminClient
  .from("books")
  .upsert(
    { kakao_id: data.bookKakaoId, title: "...", author: "...", ... },
    { onConflict: "kakao_id", ignoreDuplicates: false }
  )
  .select()
  .single();
```

`ignoreDuplicates: false`로 설정해야 기존 rows의 title/author가 최신 카카오 데이터로 갱신된다.

**users — 프로필 조회**

```ts
// username으로 단건 조회
const { data: userData, error } = await supabase
  .from("users")
  .select("*")
  .eq("username", username)
  .single();
if (!userData) notFound();
```

### RLS 정책 현황 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `users` | 누구나 | (트리거 자동) | 본인만 | - |
| `books` | 누구나 | 인증 사용자 | 인증 사용자 | - |
| `underlines` | 공개이거나 본인 것 | 본인만 (`user_id = auth.uid()`) | 본인만 | 본인만 |
| `likes` | 누구나 | 본인만 | - | 본인만 |
| `storage.objects` (`underline-images`) | 누구나 | 경로 앞부분이 본인 uid | - | 경로 앞부분이 본인 uid |

**RLS 주의 사항**:
- `underlines` SELECT: `is_public = true OR auth.uid() = user_id` — 비공개 밑줄은 본인에게만 보임.
- `books` UPDATE 정책은 `003_books_update_policy.sql`에서 추가됨. upsert 시 UPDATE 권한도 필요하므로 누락하면 `42501` 에러 발생.
- 새 테이블 생성 시 반드시 SELECT/INSERT/UPDATE/DELETE 정책 전체를 작성한다.

### Storage 버킷 접근 패턴

버킷: `underline-images` (public)
업로드 경로 규칙: `{user_id}/{timestamp}.{ext}`

```ts
// 이미지 업로드 (클라이언트에서 호출 가능)
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const path = `${userId}/${Date.now()}.jpg`;

const { data, error } = await supabase.storage
  .from("underline-images")
  .upload(path, file, { contentType: "image/jpeg" });

// Public URL 생성
const { data: { publicUrl } } = supabase.storage
  .from("underline-images")
  .getPublicUrl(path);
```

경로 앞에 `user_id`를 넣어야 Storage RLS 정책(`split_part(name, '/', 1) = auth.uid()::text`)을 통과한다.

---

## 3. Claude Vision API 통합 패턴

### 새 Analyzer 추가 방법

`src/lib/vision/analyzers/` 에 새 파일을 생성한다.

```ts
// src/lib/vision/analyzers/my-new-analyzer.ts
import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext } from "../types";

// 1. 새 결과 타입이 필요하면 types.ts에 먼저 추가한다
export type MyNewResult = {
  value: string;
  confidence: "high" | "medium" | "low";
};

// 2. Analyzer 클래스 — 생성자에서 Anthropic client 받기
export class MyNewAnalyzer {
  constructor(private client: Anthropic) {}

  async analyze(image: ImageInput, context?: OcrContext): Promise<MyNewResult> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: "...프롬프트... JSON만 반환: {...}" },
        ],
      }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    // JSON 파싱 — 항상 try/catch
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}");
      return { value: parsed.value ?? "", confidence: "medium" };
    } catch {
      return { value: "", confidence: "low" };
    }
  }
}
```

3. `orchestrator.ts`의 `analyze()` 메서드에 새 Analyzer 호출 추가.
4. `FullAnalysisResult` 타입(`types.ts`)에 새 필드 추가.
5. `tsc --noEmit`으로 타입 체크 후 커밋.

### 이미지 전처리 기준 (비용 최적화)

Claude Vision은 이미지 크기·해상도에 따라 토큰 비용이 달라진다.

| 이미지 크기 | 권장 여부 | 기준 |
|------------|----------|------|
| 1568px 이내 (장변 기준) | **최적** | Claude의 내부 최대 처리 크기 |
| 1568px 초과 | 자동 다운스케일됨 | 비용은 원본 크기 기준이 아님 |
| 300KB 이내 JPEG | 권장 | 업로드 속도 + 비용 균형 |

`/new/page.tsx`에서 이미지를 base64로 변환하기 전에 Canvas를 통해 리사이즈하는 것이 바람직하다. 현재 구현(`imageFileToBase64`)에서 리사이즈 로직이 없다면 추가를 고려한다.

**OCR 전략 우선순위 (비용 낮은 순)**:
1. Google Vision API (`GOOGLE_CLOUD_VISION_API_KEY` 있을 때) — OCR만, 텍스트 추출에 특화, 저렴
2. Claude fallback — 키 없거나 Google Vision 실패 시

### 타임아웃 / rate limit 대응 패턴

`orchestrator.ts`에서 `Promise.all([highlights, bookCandidates])`로 병렬 실행 중. 둘 다 Claude API 호출이므로:

```ts
// 타임아웃 래퍼 — 필요 시 사용
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// 사용 예
const highlights = await withTimeout(
  highlightAnalyzer.analyze(image, ocrContext),
  15_000,
  { segments: [], ranges: [] }
);
```

**Anthropic rate limit**: Tier에 따라 분당 요청 수 제한. 429 응답 시 `Retry-After` 헤더 확인. Route Handler에서는 `502` 반환 후 클라이언트가 재시도하도록 유도.

### 응답 신뢰도 낮을 때 폴백 처리

`BookAnalyzer`는 멀티 LLM (GPT-4o, Claude, Gemini) 병렬 실행 → 결과 중복 제거 → 카카오 API 검증 순서. 카카오 API에서 매칭되지 않으면 `null` 반환.

```ts
// 폴백 우선순위 (book-analyzer.ts 기준)
// 1. analyzeAll() — GPT + Claude + Gemini 병렬, 카카오로 검증
// 2. tryGoogleBooks() — 본문 구절로 Google Books 검색
// 3. tryClaudeImage() — 이미지 직접 분석 (최종)
// 4. null — 이 경우 UI에서 수동 입력 요구

// UI 레이어에서 null 처리
if (!result.book) {
  // BookSearchInput으로 수동 입력 단계로 이동
  setStep("book");
}
```

`HighlightResult.segments`가 빈 배열인 경우: 밑줄이 없는 페이지이거나 인식 실패. UI에서 전체 텍스트를 보여주고 사용자가 직접 선택하도록 fallback.

---

## 4. 카카오 도서 API 패턴

### 검색 결과 신뢰도 판단 기준

카카오 도서 API는 퍼지 매칭을 지원하므로 관련 없는 책이 반환될 수 있다. 다음 기준으로 신뢰도를 판단한다:

| 기준 | 높음 | 낮음 |
|------|------|------|
| ISBN 있음 | `isbn` 필드 비어있지 않음 | `""` 또는 공백만 |
| 제목 일치도 | 검색어와 80% 이상 겹침 | 완전히 다른 제목 |
| 저자 포함 검색 결과 | 저자명도 일치 | 제목만 일치 |
| `status` | `"정상판매"` | `"절판"`, `"품절"` |

```ts
// isbn 추출 — 카카오는 "isbn10 isbn13" 형식으로 반환
const isbnParts = (doc.isbn ?? "").trim().split(" ");
const isbn = isbnParts[isbnParts.length - 1] || isbnParts[0] || "";
// 마지막 값이 13자리 ISBN-13
```

### books 테이블 중복 방지 전략 (ISBN 기준 upsert)

`books` 테이블은 `kakao_id TEXT UNIQUE`를 기준으로 upsert한다.

```ts
// kakao_id = ISBN-13 (있으면) 또는 제목 (ISBN 없을 때)
const kakaoId = isbn || bookTitle;

await adminClient
  .from("books")
  .upsert(
    {
      kakao_id: kakaoId,
      title: bookTitle,
      author: bookAuthor,
      publisher: bookPublisher ?? null,
      cover_url: bookCoverUrl ?? null,
      isbn: isbn || null,
    },
    { onConflict: "kakao_id", ignoreDuplicates: false }
  )
  .select()
  .single();
```

`ignoreDuplicates: false` — 기존 책 정보(표지 URL 등)가 갱신될 수 있도록 항상 업데이트.

### ISBN 없는 경우 처리

카카오 API가 ISBN을 반환하지 않는 경우 (오래된 책, 전자책 등):

```ts
// 1. isbn 필드가 빈 문자열인 경우
const isbn = (doc.isbn ?? "").trim();
// isbn === "" → kakao_id = doc.title 로 폴백

// 2. kakao_id를 제목으로 설정 (books.ts에서 이미 구현됨)
kakao_id: isbn || doc.title
```

ISBN 없는 책은 `kakao_id = title`이므로, 동명이서(同名異書)가 존재할 수 있다. 이 경우 출판사나 저자 정보로 추가 구분이 불가능하므로 허용되는 한계로 인식한다.

---

## 5. 성능 체크리스트

### 피드 페이지 N+1 방지 패턴

피드에서 underline → user, underline → book을 별도 쿼리로 루프 실행하면 N+1 발생. 반드시 **단일 쿼리 JOIN**으로 해결한다.

```ts
// 올바름 — 단일 쿼리 JOIN
const { data } = await supabase
  .from("underlines")
  .select(`
    *,
    user:users!underlines_user_id_fkey(*),
    book:books(*)
  `)
  .eq("is_public", true)
  .order("created_at", { ascending: false })
  .limit(50);

// 금지 — 루프 안에서 추가 쿼리
for (const underline of underlines) {
  const user = await supabase.from("users").select("*").eq("id", underline.user_id);
  // N+1 발생
}
```

**likes 최적화**: 피드 렌더링 전 현재 유저의 좋아요 목록을 **한 번**만 조회해 `Set<string>`으로 변환 후 사용. 각 카드에서 개별 조회 금지.

```ts
const { data: likesData } = await supabase
  .from("likes")
  .select("underline_id")
  .eq("user_id", currentUser.id);
const likedIds = new Set((likesData ?? []).map((l) => l.underline_id));
```

### 이미지 최적화

**책 표지 (카카오 CDN)**:
- 카카오에서 반환하는 `thumbnail`은 `120×174px` 저해상도.
- `next/image`의 `width={60} height={88}` 또는 `width={120} height={174}` — 원본보다 크게 렌더링하지 않는다.
- `quality` prop은 기본값(75) 유지.

**유저 업로드 이미지 (Supabase Storage)**:
- `fill` + `sizes` 조합으로 반응형 처리.
- 모바일 기준 `sizes="(max-width: 430px) 100vw, 430px"`.
- Supabase Storage는 이미지 변환을 지원하므로 URL에 `?width=800&quality=80` 파라미터 추가 가능.

```ts
// Supabase Storage 이미지 변환 (고해상도 원본에 적용)
const optimizedUrl = `${publicUrl}?width=800&quality=80`;
```

### 동적 임포트 사용 기준

| 컴포넌트 | 적용 여부 | 이유 |
|---------|----------|------|
| `ShareCardButton` + 공유 카드 렌더러 | **적용** | 캔버스/html2canvas 라이브러리 무거움 |
| `ImageCropRotate` | 고려 | crop 라이브러리 크기 큰 경우 |
| `BookSearchInput` | 불필요 | 작은 컴포넌트 |
| 피드 카드 컴포넌트 | 불필요 | 초기 렌더링에 필수 |

```ts
import dynamic from "next/dynamic";

const ShareCardButton = dynamic(() => import("@/components/features/ShareCardButton"), {
  ssr: false, // 캔버스 API는 브라우저 전용
  loading: () => <span>로딩 중...</span>,
});
```

---

## 6. 코드 품질 기준

### any 타입 허용/금지 케이스

**허용** (현재 codebase에서도 사용 중):
- Supabase 쿼리 결과에 `as unknown as MyType` 캐스팅 — Supabase가 자동 생성 타입과 실제 응답 타입이 맞지 않을 때 불가피.
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 주석과 함께, 이유를 인라인 코멘트로 명시.

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any; // Supabase 타입 추론 한계로 인한 임시 처리
```

**금지**:
- 함수 파라미터/리턴 타입에 무조건 `any` 사용.
- 외부 API 응답 전체를 `any`로 받는 것 — 최소한 응답 형태를 타입으로 정의.
- `any[]` 배열을 `.map()` 없이 직접 반환.

**대안**: Supabase 타입이 맞지 않으면 `as unknown as T`로 명시적 캐스팅. 외부 API 응답은 필요 필드만 타입 정의.

```ts
// 올바른 패턴
type KakaoDoc = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  isbn: string;
};
const doc = data.documents?.[0] as KakaoDoc | undefined;
```

### 에러 경계 설정 기준

Next.js App Router에서 에러 경계는 `error.tsx` 파일로 설정한다.

| 경로 | 에러 경계 파일 | 적용 범위 |
|------|--------------|---------|
| `src/app/error.tsx` | 전역 | 모든 페이지 |
| `src/app/(main)/error.tsx` | 메인 레이아웃 | 인증 후 모든 페이지 |
| `src/app/(main)/feed/error.tsx` | 피드만 | 피드 페이지 에러 |

인라인 에러는 `<Alert variant="error">` 컴포넌트 사용 (ux-design.md 규칙). `error.tsx`는 페이지 전체가 깨지는 치명적 에러용.

```tsx
// src/app/(main)/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Alert variant="error">페이지를 불러오지 못했어요.</Alert>
      <button onClick={reset} className="text-sm text-[var(--color-forest)]">
        다시 시도
      </button>
    </div>
  );
}
```

### 컴포넌트 파일 구조 표준

```
src/components/
├── ui/           # 도메인 독립 재사용 컴포넌트
│   ├── Alert.tsx          — 경고/안내/성공 메시지 (필수 사용)
│   ├── BookCover.tsx      — 책 표지 + fallback
│   ├── ProfileChip.tsx    — 아바타 + 닉네임
│   └── TagBadge.tsx       — 취향 태그
└── features/    # 밑줄 도메인 컴포넌트
    ├── UnderlineCard.tsx       — 피드 카드 (단건)
    ├── UnderlineGroupCard.tsx  — 같은 이미지 묶음 카드
    ├── BookFeedCard.tsx        — 책 단위 피드 카드
    ├── LikeButton.tsx          — 좋아요 토글
    ├── DeleteUnderlineButton.tsx — 밑줄 삭제
    ├── ShareCardButton.tsx     — 공유 카드 생성
    ├── FeedFilter.tsx          — 태그 필터
    ├── BookSearchInput.tsx     — 책 검색
    └── ImageCropRotate.tsx     — 이미지 크롭/회전
```

**파일 내부 구조 표준**:

```tsx
// 1. "use client" — 필요한 경우만 최상단
"use client";

// 2. import — 외부 라이브러리 → Next.js → 내부 컴포넌트 → 타입
import { useState } from "react";
import Image from "next/image";
import Alert from "@/components/ui/Alert";
import type { Underline } from "@/types";

// 3. 로컬 타입 정의
type Props = { underline: Underline };

// 4. 컴포넌트 — export default
export default function UnderlineCard({ underline }: Props) {
  // ...
}

// 5. 서브 컴포넌트 — export 없이 동일 파일 하단
function BookInfo({ book }: { book: Underline["book"] }) {
  // ...
}
```

**이름 규칙**:
- 컴포넌트 파일: PascalCase (`UnderlineCard.tsx`)
- 유틸 파일: camelCase (`kakaoToGenre.ts`)
- 훅 파일: `use` 접두사 + camelCase (`useUnderlineEditor.ts`)
- Server Action 파일: 도메인명 (`underline.ts`, `likes.ts`)

**컴포넌트 코멘트 최소화**: 컴포넌트 이름과 prop 이름으로 의도가 명확해야 한다. 복잡한 비즈니스 로직에만 인라인 주석 허용.

---

## 체크리스트 — 작업 시작 전

- [ ] `params` / `searchParams`를 `await`하고 있는가? (Next.js 15)
- [ ] 서버 컴포넌트에서 `createClient()`는 `server.ts`에서 가져오는가?
- [ ] 클라이언트 컴포넌트에서 `createClient()`는 `client.ts`에서 가져오는가?
- [ ] `createAdminClient()`는 Server Action / Route Handler에서만 사용하는가?
- [ ] 새 테이블/정책 추가 시 RLS SELECT/INSERT/UPDATE/DELETE 모두 작성했는가?
- [ ] 에러 메시지는 `<Alert variant="error">`로 표시하는가?
- [ ] 이미지는 `next/image`로 렌더링하는가?
- [ ] Supabase JOIN 쿼리에서 FK 이름(`!underlines_user_id_fkey`)을 명시했는가?
- [ ] `any` 사용 시 이유 주석을 달았는가?
- [ ] Vision Analyzer 수정 후 `tsc --noEmit` 통과했는가?
