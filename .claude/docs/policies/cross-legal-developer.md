# 교차 검증: Legal × Developer — 프라이버시 설계 구현 가이드

> 작성: Legal + Developer 교차 검증 에이전트 | 날짜: 2026-06-22
> 참조: `legal-policy.md` (Legal 에이전트), `developer-policy.md` (Developer 에이전트)
> 본 문서는 법적 요구사항이 실제 코드 레이어에서 어떻게 구현되어야 하는지를 연결한다.

---

## 개요

`legal-policy.md`는 PIPA(개인정보보호법), 저작권법, 외부 API 이용약관 준수 관점에서 요구사항을 도출한다.
`developer-policy.md`는 Next.js 15 App Router, Supabase, Vision API 통합 패턴을 정의한다.

두 정책의 교차 검증 결과, 다음 영역에서 구체적인 구현 가이드가 필요하다.

1. EXIF 위치정보 제거 (High Risk — 즉시 조치 필요)
2. 탈퇴 시 데이터 삭제 순서와 방법
3. Vision API 처리 이미지 보존 정책
4. 동의 수집 및 마케팅 알림 제어
5. 저작권 출처 표시 의무의 코드 강제화

---

## 법적 요구사항 → 코드 구현 매핑

| # | 법적 요구사항 | 법적 근거 | 구현 방법 | 담당 파일/컴포넌트 | 현재 상태 |
|---|--------------|-----------|-----------|-------------------|-----------|
| 1 | EXIF 위치정보 제거 | PIPA 제23조, 위치정보법 | Route Handler에서 `sharp` 라이브러리로 업로드 전 EXIF strip | `src/app/api/vision/analyze/route.ts` 또는 이미지 저장 Route Handler | **미확인 — 즉시 점검 필요** |
| 2 | 업로드 이미지에 유저 ID 경로 보안 | PIPA 제29조 (안전성 확보) | Storage 경로 `{user_id}/{timestamp}.ext` 규칙 — RLS가 `split_part(name, '/', 1) = auth.uid()` 로 보호 | `developer-policy.md` §2 Storage 패턴 / Supabase RLS | 구현됨 |
| 3 | 책 제목·저자·출판사 출처 표시 의무 | 저작권법 제37조 | `underlines` 테이블이 `book_id` FK로 `books`(title, author, publisher) 연결 — 렌더링 시 반드시 JOIN | `UnderlineCard.tsx`, `ShareCardButton.tsx`, 공유 카드 | 부분 구현 — publisher 표시 여부 점검 필요 |
| 4 | OCR 밑줄 문장 저장 범위 제한 (500자 이내 안전) | 저작권법 제28조 인용 조항 | `highlight-analyzer.ts` 출력 결과를 DB INSERT 전에 글자 수 검증. 500자 초과 시 저장 차단 또는 경고 | `src/lib/vision/analyzers/highlight-analyzer.ts`, `src/app/actions/underline.ts` | 기술적 제한 없음 — 추가 필요 |
| 5 | 탈퇴 시 개인정보 삭제 (30일 이내) | PIPA 제21조 | 탈퇴 Server Action에서 underlines, likes, storage 파일, users 순서로 삭제. 즉시 삭제 또는 `deleted_at` 소프트 삭제 후 배치 처리 | `src/app/actions/auth.ts` 또는 `/api/user/delete` Route Handler | 미구현 |
| 6 | 탈퇴 후 공개 밑줄 처리 (익명화 또는 삭제) | PIPA 제21조, 서비스 정책 | 탈퇴 시 `underlines.user_id = NULL` 업데이트 (익명화) 또는 전체 DELETE — 정책 결정 후 구현 | `src/app/actions/auth.ts` | 미수립 — 정책 결정 필요 |
| 7 | 동의 수집 — 마케팅 알림 수신 | 정보통신망법 제50조 | `users` 테이블에 `marketing_agreed BOOLEAN DEFAULT false`, `marketing_agreed_at TIMESTAMPTZ` 컬럼 추가. 회원가입 시 UI에서 동의 체크박스 제공 | `supabase/migrations/`, `/signup/page.tsx` | 미구현 |
| 8 | 마케팅 수신 거부 이력 6개월 보존 | 정보통신망법 제50조의5 | `marketing_consent_logs` 테이블 신설 (user_id, action, agreed_at) — INSERT only, DELETE 없음 | `supabase/migrations/` | 미구현 |
| 9 | 접속 로그 3개월 후 삭제 | PIPA 보존 기간 정책 | Vercel 함수 로그는 자동 만료 (1~7일). 앱 레벨 로그를 Supabase에 저장하는 경우 `created_at` 기준 90일 후 삭제 배치 필요 | Vercel 설정 / Supabase cron | Vercel 기본값으로 단기 보존 중 |
| 10 | 카카오 책 표지 직접 저장 금지 | 카카오 API 이용약관 | `books.cover_url`에 카카오 CDN URL만 저장. Supabase Storage에 표지 이미지 복사 금지. `next/image` remotePatterns에 카카오 CDN 도메인만 허용 | `src/app/actions/underline.ts`, `next.config.ts` | 현재 URL만 저장 중 (준수) — 유지 |
| 11 | Vision API 이미지 전송 처리방침 기재 | PIPA 제26조 (처리 위탁) | 개인정보처리방침 `/privacy` 페이지에 "Google Cloud Vision API 이미지 처리 위탁" 항목 추가. 코드에서 Vision API 호출 시 개인 얼굴 포함 이미지 여부 안내 문구 추가 고려 | `src/app/privacy/page.tsx` (미생성) | 미구현 |
| 12 | 비공개 밑줄 RLS 보호 | PIPA 제29조 | `underlines` SELECT RLS: `is_public = true OR auth.uid() = user_id` — 이미 구현됨 | Supabase RLS / `developer-policy.md` §2 | 구현됨 |

---

## EXIF 메타데이터 제거 구현 가이드

### 왜 서버에서 제거해야 하는가

클라이언트(브라우저)에서 EXIF를 제거하면 악의적 유저가 우회할 수 있다. 반드시 서버 사이드 Route Handler에서 처리해야 한다.

### 현재 이미지 업로드 경로 파악

이미지가 Supabase Storage에 저장되는 경로는 두 가지다:

1. **클라이언트에서 직접 업로드** — `/new/page.tsx`에서 `supabase.storage.upload()` 직접 호출
2. **서버 Route Handler를 통한 업로드** — `/api/vision/analyze` Route Handler

EXIF 제거는 (1)의 경우 클라이언트에서 호출되므로 **별도의 서버 경유 업로드 Route Handler**가 필요하거나, 클라이언트에서 Canvas를 통해 EXIF를 제거한 후 업로드해야 한다.

### 구현 옵션 A: 서버 Route Handler에서 sharp 사용 (권장)

```ts
// src/app/api/upload/route.ts — 신규 생성 필요
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // EXIF 전체 제거 — withMetadata() 없이 처리하면 EXIF가 자동 스트립됨
  const stripped = await sharp(buffer)
    .rotate()           // EXIF orientation 적용 후 태그 제거
    .jpeg({ quality: 85 })
    .toBuffer();

  const path = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("underline-images")
    .upload(path, stripped, { contentType: "image/jpeg" });

  if (uploadError) return NextResponse.json({ error: "업로드 실패" }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("underline-images")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl, path });
}
```

**설치 필요**: `npm install sharp`
**next.config.ts**: Sharp는 native module이므로 Vercel 배포 시 자동 포함됨.

### 구현 옵션 B: 클라이언트에서 Canvas로 EXIF 제거 (차선책)

```ts
// /new/page.tsx 또는 ImageCropRotate.tsx 내 유틸 함수
async function stripExif(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      // Canvas로 재인코딩하면 EXIF가 제거된 새 Blob 생성
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// 사용
const cleanFile = await stripExif(originalFile);
await supabase.storage.from("underline-images").upload(path, cleanFile, { contentType: "image/jpeg" });
```

**한계**: 브라우저 전용, 클라이언트 우회 가능. 옵션 A와 병용 시 이중 보호.

### 즉시 확인 사항

```bash
# 현재 코드베이스에서 이미지 업로드 호출 위치 전수 점검
grep -rn "storage.*upload\|upload.*storage" src/ --include="*.ts" --include="*.tsx"
```

위 명령으로 나오는 모든 업로드 지점에 EXIF 제거 로직이 적용되었는지 확인한다.

---

## 탈퇴 시 데이터 삭제 구현 패턴

### 삭제 순서 (외래 키 의존성 고려)

Supabase PostgreSQL에서 FK 제약이 있으므로 자식 테이블 → 부모 테이블 순서로 삭제한다.

```
1. likes (underline_id FK → underlines, user_id FK → users)
2. underlines의 이미지 파일 (Supabase Storage에서 경로별 삭제)
3. underlines (book_id FK → books, user_id FK → users)
4. Supabase Storage의 {user_id}/ 폴더 전체
5. users (Supabase Auth에서 auth.users 삭제 — admin client 필요)
```

### 구현 패턴

```ts
// src/app/actions/auth.ts 또는 src/app/api/user/delete/route.ts
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  const userId = user.id;

  try {
    // 1. likes 삭제
    await adminClient.from("likes").delete().eq("user_id", userId);

    // 2. 이미지 파일 목록 조회 후 Storage 삭제
    const { data: underlines } = await adminClient
      .from("underlines")
      .select("image_url")
      .eq("user_id", userId)
      .not("image_url", "is", null);

    if (underlines && underlines.length > 0) {
      // Storage 경로 추출 (public URL에서 경로 파싱)
      const paths = underlines
        .map((u) => {
          const url = u.image_url as string;
          // "https://{project}.supabase.co/storage/v1/object/public/underline-images/{path}"
          const match = url.match(/underline-images\/(.+)$/);
          return match?.[1] ?? null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        await adminClient.storage.from("underline-images").remove(paths);
      }
    }

    // 3. underlines 처리 — 정책에 따라 두 가지 옵션 중 선택
    // 옵션 A: 완전 삭제
    await adminClient.from("underlines").delete().eq("user_id", userId);

    // 옵션 B: 익명화 (공개 밑줄 유지, 작성자만 제거)
    // await adminClient.from("underlines")
    //   .update({ user_id: null })
    //   .eq("user_id", userId)
    //   .eq("is_public", true);
    // await adminClient.from("underlines").delete().eq("user_id", userId).eq("is_public", false);

    // 4. {user_id}/ 폴더 잔여 파일 정리 (프로필 사진 등)
    const { data: storageFiles } = await adminClient.storage
      .from("underline-images")
      .list(userId);
    if (storageFiles && storageFiles.length > 0) {
      const remainingPaths = storageFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from("underline-images").remove(remainingPaths);
    }

    // 5. users 레코드 삭제 (profiles 테이블)
    await adminClient.from("users").delete().eq("id", userId);

    // 6. Supabase Auth 계정 삭제 (service role 필요)
    await adminClient.auth.admin.deleteUser(userId);

    return {};
  } catch (error) {
    console.error("계정 삭제 실패:", error);
    return { error: "계정 삭제에 실패했습니다. 고객센터에 문의하세요." };
  }
}
```

### 중요: 공개 밑줄 처리 정책 결정 필요

법적 요구사항과 서비스 UX 사이의 트레이드오프:

| 옵션 | 설명 | 법적 근거 | UX 영향 |
|------|------|-----------|---------|
| 완전 삭제 | 탈퇴 시 모든 밑줄 즉시 삭제 | PIPA 제21조 원칙에 부합 | 다른 유저의 북 피드에서 문장이 사라짐 |
| 익명화 | 공개 밑줄은 유지, 작성자 정보만 제거 | PIPA 제28조의7(가명처리) 활용 가능 | 콘텐츠 연속성 유지 — books 페이지 히트맵 유지됨 |

**권고**: 서비스 초기에는 완전 삭제(옵션 A)를 기본으로 구현. 데이터 기반 히트맵 등 집계 기능 강화 시 익명화 정책으로 전환. **어느 쪽이든 이용약관에 명시 필수.**

---

## Vision API 처리 이미지 보존 정책

### 법적 요구사항 정리

- `legal-policy.md` §2: "업로드 원본 이미지: OCR 처리 완료 후 Supabase Storage에 유지 (유저가 삭제하기 전까지)"
- Google Cloud Vision API는 처리 후 이미지를 Google 서버에 보존하지 않는다 (Google DPA 확인 필요).
- 개인정보처리방침에 "Google Cloud Vision API 이미지 처리 위탁" 기재 의무.

### 현재 아키텍처와 보존 경로

```
유저 업로드 → /api/vision/analyze Route Handler
  → Google Cloud Vision API (OCR) — 처리 후 즉시 폐기 (Google 정책)
  → Claude Vision API (밑줄 감지/책 식별) — 처리 후 즉시 폐기 (Anthropic 정책)
  → 분석 결과만 클라이언트로 반환
  → 유저가 확인 후 저장 시: 이미지를 Supabase Storage에 업로드
```

원본 이미지는 Vision API로 전송되지만 **Supabase Storage에는 유저 확인 후에만 저장**된다. 이 구조는 불필요한 이미지 저장을 최소화하는 PIPA 데이터 최소화 원칙에 부합한다.

### 구현해야 할 자동 삭제 정책

**정책**: 유저가 저장하지 않고 세션을 종료한 경우 임시 이미지가 Storage에 남는다면 정리가 필요하다.

```ts
// 미래 구현 — 임시 업로드 경로 분리 (현재 불필요하나 설계 참고)
// 임시: {user_id}/tmp/{timestamp}.jpg
// 확정: {user_id}/{timestamp}.jpg

// Supabase Edge Function 또는 외부 cron으로 24시간 이상 된 tmp/ 파일 삭제
```

**현재 권고**: 별도 임시 경로 없이 저장 확정 시에만 Storage에 업로드하는 현재 플로우를 유지한다. 불필요한 이미지가 Storage에 누적되는 케이스가 없는지 `/new/page.tsx`의 플로우를 점검한다.

### Vision API 호출 시 개인정보 처리 주의사항

```ts
// src/app/api/vision/analyze/route.ts 점검 사항
// 1. 이미지를 API 호출 전 로그에 출력하지 않는다 (Vercel 로그에 base64 노출 방지)
// 2. 오류 응답에 원본 이미지 데이터를 포함하지 않는다

// 금지
console.log("이미지 데이터:", imageBase64); // 절대 금지

// 허용
console.log("Vision API 호출:", { imageSize: buffer.length, mimeType });
```

---

## Legal-Developer 충돌 케이스 및 합의

### 충돌 케이스 1: 책 표지 이미지 저장 방식

**Legal 요구**: 카카오 CDN URL만 참조. Supabase Storage에 복사 저장 금지 (카카오 이용약관).

**Developer 요구**: `next/image`로 최적화하려면 `remotePatterns`에 외부 도메인을 등록해야 하고, 카카오 CDN URL이 만료되면 이미지가 깨질 수 있다. 장기적으로 직접 저장이 더 안정적이다.

**합의된 접근법**:
- 단기(현재 MVP): 카카오 CDN URL만 `books.cover_url`에 저장. `next.config.ts`의 `remotePatterns`에 카카오 CDN 도메인 등록. Legal 요구 준수 우선.
- 장기(P2): 카카오로부터 이미지 재사용 허가를 명시적으로 확인하거나, 출판사 직접 계약 또는 Open Library API 등 퍼블릭 도메인 소스로 전환 시 Supabase Storage 저장으로 마이그레이션 검토.
- **현재 코드**: `cover_url`에 URL만 저장하고 있으므로 준수 상태 유지.

### 충돌 케이스 2: 탈퇴 후 공개 밑줄 처리 — 완전 삭제 vs. 익명화

**Legal 요구**: PIPA 제21조에 따라 탈퇴 시 개인정보 삭제. 그러나 법 조문상 "개인정보"가 삭제되면 되므로, 책 문장 자체(개인정보 아님)를 익명화해 보존하는 것은 허용된다.

**Developer 요구**: `/book/[id]` 히트맵, 인용 수 집계 등의 기능은 과거 밑줄 데이터에 의존한다. 완전 삭제 시 서비스 품질이 저하된다.

**합의된 접근법**:
- `underlines.user_id` 컬럼에 `NULL` 허용하도록 DB 스키마 변경 (현재 NOT NULL이면 마이그레이션 필요).
- 탈퇴 시 공개 밑줄은 `user_id = NULL` 업데이트 (익명화), 비공개 밑줄은 완전 삭제.
- 이용약관에 "탈퇴 시 공개된 밑줄 문장은 작성자 정보가 제거된 채 서비스에 유지될 수 있습니다"를 명시.
- **구현 전 이용약관 게시가 선행**되어야 한다.

```sql
-- 마이그레이션 필요 시
ALTER TABLE underlines ALTER COLUMN user_id DROP NOT NULL;
```

### 충돌 케이스 3: Vision 분석 중 이미지 서버 전송 동의

**Legal 요구**: Google Cloud Vision API로 이미지를 전송하는 것은 개인정보 처리 위탁이며, 개인정보처리방침에 명시해야 한다. 이상적으로는 이미지 전송 전에 유저가 인지하도록 안내해야 한다.

**Developer 요구**: `/new/page.tsx`의 멀티스텝 플로우에서 사진 업로드 직후 분석이 자동 시작된다. 매 분석마다 동의 팝업을 띄우면 UX가 크게 저하된다.

**합의된 접근법**:
- 개별 분석마다 동의를 받지 않는다 (UX 저하, 과도한 조치).
- 대신 **회원가입 시 이용약관 동의** 단계에서 "사진은 OCR 처리를 위해 Google Vision API로 전송됩니다"를 이용약관/개인정보처리방침에 포함.
- `/new` 페이지 사진 업로드 UI에 **작은 안내 텍스트** 추가: "사진은 텍스트 인식 후 삭제됩니다."
- 개인정보처리방침 `/privacy` 페이지를 생성하고 회원가입 화면에 링크 필수.

```tsx
// /new/page.tsx 사진 업로드 UI 하단 안내 추가 예시
<p className="text-xs text-[var(--color-ink-faint)] mt-2">
  사진은 텍스트 인식 목적으로만 사용되며, 분석 후 서버에 저장되지 않습니다.
  <a href="/privacy" className="underline ml-1">개인정보처리방침</a>
</p>
```

---

## 즉시 조치 항목 요약 (우선순위 순)

| 우선순위 | 항목 | 담당 | 예상 공수 |
|---------|------|------|-----------|
| P0 — 즉시 | EXIF 제거 로직 확인/추가 | Developer | 2~4h |
| P0 — 즉시 | 개인정보처리방침 `/privacy` 페이지 작성 및 게시 | Developer + Legal | 4~8h |
| P0 — 즉시 | 이용약관 `/terms` 페이지 작성 및 게시 | Developer + Legal | 4~8h |
| P1 | 탈퇴 기능 구현 (settings 페이지) | Developer | 4~6h |
| P1 | `underlines` 글자 수 제한 검증 추가 (500자) | Developer | 1~2h |
| P1 | 회원가입 시 마케팅 수신 동의 UI + DB 컬럼 추가 | Developer | 2~4h |
| P2 | `marketing_consent_logs` 테이블 신설 | Developer | 1h |
| P2 | 카카오 API 검색 결과 캐시 유효기간 24h 정책 구현 | Developer | 2h |

---

> 본 문서는 두 정책의 교차 검증 결과이며, 실제 법적 효력은 자격 있는 변호사의 확인이 필요합니다.
> 최종 업데이트: 2026-06-22
