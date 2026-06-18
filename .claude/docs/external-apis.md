# 외부 API 레퍼런스

> 밑줄 서비스에서 사용 중인 외부 API 정리

---

## 1. 카카오 도서 API

**용도**: 책 제목·저자 검색, 책 정보 조회  
**키 위치**: `.env.local` → `KAKAO_REST_API_KEY`  
**서버 전용**: API 키 노출 방지 위해 반드시 서버에서만 호출  
**프로젝트 내 라우트**: `src/app/api/books/search/route.ts`

### 엔드포인트
```
GET https://dapi.kakao.com/v3/search/book
Authorization: KakaoAK {REST_API_KEY}
```

### 파라미터
| 파라미터 | 필수 | 설명 | 예시 |
|---------|------|------|------|
| `query` | ✓ | 검색어 (제목, 저자, ISBN) | `채식주의자` |
| `size` | - | 결과 수 (기본 10, 최대 50) | `5` |
| `page` | - | 페이지 (기본 1, 최대 50) | `1` |
| `target` | - | 검색 필드 제한 (`title`, `isbn`, `publisher`, `person`) | `title` |

### 응답 필드 (`documents[]`)
| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | string | 책 제목 |
| `authors` | string[] | 저자 목록 |
| `publisher` | string | 출판사 |
| `isbn` | string | ISBN-10 + ISBN-13 (공백 구분) — `split(' ').at(-1)` 로 13자리 추출 |
| `thumbnail` | string | 표지 이미지 URL (120×174) |
| `contents` | string | 책 소개 (최대 200자) |
| `price` | number | 정가 |
| `sale_price` | number | 판매가 (-1 이면 판매 중단) |
| `status` | string | 판매 상태 (`정상판매`, `절판`, `품절` 등) |
| `datetime` | string | 출판일 (ISO 8601) |
| `translators` | string[] | 번역자 목록 |
| `url` | string | 다음 책 상세 페이지 URL |

### 예시 호출
```bash
curl "https://dapi.kakao.com/v3/search/book?query=채식주의자&size=5" \
  -H "Authorization: KakaoAK {KEY}"
```

### 제한
- 분당 300회 (QPS 5)
- 무료, 별도 심사 없음

---

## 2. Claude Vision API (Anthropic)

**용도**: 책 페이지 OCR + 밑줄 감지 + 책 식별 + 페이지 번호 추출 — 단일 호출로 처리  
**키 위치**: `.env.local` → `ANTHROPIC_API_KEY`  
**서버 전용**: 반드시 서버에서만 호출  
**사용 모델**: `claude-sonnet-4-6` (orchestrator.ts 기준)  
**프로젝트 내 라우트**: `src/app/api/vision/analyze/route.ts`  
**분석 모듈**: `src/lib/vision/` (Analyzer 클래스 구조)

### 파이프라인 구조
```
POST /api/vision/analyze
  └── VisionOrchestrator.analyze(imageInput)
        ├── HighlightAnalyzer   → 밑줄/형광 위치 감지
        ├── BookAnalyzer        → 책 제목/저자 식별 (카카오 API 연동)
        └── PageNumberAnalyzer  → 페이지 번호 추출
```

### 독립 엔드포인트
| 엔드포인트 | 역할 |
|---|---|
| POST /api/vision/analyze | 전체 파이프라인 |
| POST /api/vision/highlight | 밑줄 감지만 |
| POST /api/vision/book | 책 식별만 |
| POST /api/vision/page | 페이지 번호만 |

### 요청 형식
```json
{ "imageBase64": "{BASE64_STRING}" }
```

### 응답 형식 (analyze)
```json
{
  "highlights": [{ "text": "밑줄 친 문장" }],
  "book": { "title": "책 제목", "author": "저자", "kakaoId": "..." },
  "pageNumber": 42
}
```

### 요금
- Anthropic API 사용량 기반 과금 (claude-sonnet-4-6 기준)
- 키 위치: `.env.local` → `ANTHROPIC_API_KEY`

> `GOOGLE_CLOUD_VISION_API_KEY` 환경변수는 현재 미사용 — Vision 기능 전체가 Claude로 대체됨

---

## 3. Supabase

**용도**: PostgreSQL DB + 인증(Auth) + 파일 스토리지  
**프로젝트 URL**: `https://dufzfxyimtediibdmiyk.supabase.co`  
**대시보드**: https://supabase.com/dashboard/project/dufzfxyimtediibdmiyk

### 환경변수
| 변수 | 용도 | 사용 위치 |
|------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL | 클라이언트 + 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 키 (RLS 적용) | 클라이언트 + 서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 키 (RLS 우회) | 서버 전용 |

### 클라이언트 파일
| 파일 | 용도 |
|------|------|
| `src/lib/supabase/client.ts` | 브라우저 클라이언트 (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | 서버 클라이언트 (`createServerClient`) |
| `src/lib/supabase/middleware.ts` | 세션 갱신 미들웨어 |
| `src/lib/supabase/types.ts` | DB 타입 정의 |

### Storage 버킷
| 버킷 | 공개 | 용도 |
|------|------|------|
| `underline-images` | ✓ | 책 페이지 촬영 이미지 저장 |

업로드 경로: `{user_id}/{timestamp}.{ext}`

### Admin API (관리자 작업용)
```bash
# 유저 목록
GET https://dufzfxyimtediibdmiyk.supabase.co/auth/v1/admin/users
Authorization: Bearer {SERVICE_ROLE_KEY}

# 유저 수정 (이메일 인증, 비밀번호 변경 등)
PUT https://dufzfxyimtediibdmiyk.supabase.co/auth/v1/admin/users/{id}
Body: { "email_confirm": true, "password": "..." }
```

---

## 키 관리 원칙

- 모든 API 키는 `.env.local` 에만 저장 (`.gitignore` 처리됨)
- 카카오, Vision, Supabase service role → **서버에서만** 호출
- `NEXT_PUBLIC_` 접두사 변수만 브라우저에 노출됨
