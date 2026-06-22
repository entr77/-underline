# 기술 스택 & 아키텍처

## 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|----------|
| Framework | Next.js 15 (App Router, TypeScript) | SSR/SSG, Server Actions, 파일 기반 라우팅 |
| Styling | Tailwind CSS v4 | 디자인 토큰, CSS variables (@theme) |
| DB | Supabase (PostgreSQL) | RLS 내장, Auth, Storage 통합 |
| Auth | Supabase Auth | 이메일 + Google OAuth, SSR 쿠키 기반 |
| Storage | Supabase Storage | 이미지 업로드, public bucket |
| OCR / 이미지 분석 | Claude Vision API (claude-sonnet-4-6) | OCR + 밑줄 감지 + 책 식별 단일 호출 |
| 책 검색 | 카카오 도서 API | 한국 도서 DB, ISBN 기반, 무료 |
| 배포 | Vercel | Next.js 최적화, 자동 배포 |
| 버전 관리 | GitHub | https://github.com/entr77/-underline |

## 외부 API

| 서비스 | 엔드포인트 | 프록시 라우트 | 키 위치 |
|--------|-----------|-------------|--------|
| 카카오 도서 | https://dapi.kakao.com/v3/search/book | /api/books/search | KAKAO_REST_API_KEY |
| Anthropic Claude | https://api.anthropic.com/v1/messages | /api/vision/* | ANTHROPIC_API_KEY |
| Supabase DB | PostgREST (자동 생성) | Supabase JS Client | NEXT_PUBLIC_SUPABASE_* |
| Supabase Storage | /storage/v1/ | Supabase JS Client | SUPABASE_SERVICE_ROLE_KEY (서버) |

## 환경변수

| 변수 | 용도 | 노출 범위 |
|------|------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | 클라이언트 + 서버 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 공개 키 (RLS 적용) | 클라이언트 + 서버 |
| SUPABASE_SERVICE_ROLE_KEY | 관리자 키 (RLS 우회) | 서버 전용 |
| KAKAO_REST_API_KEY | 카카오 도서 API | 서버 전용 |
| ANTHROPIC_API_KEY | Claude Vision OCR + 이미지 분석 | 서버 전용 |

## 아키텍처 원칙

- **Server Component 기본** — 인터랙션 필요한 경우만 `"use client"`
- **API 키 서버 격리** — 카카오, Anthropic, service role key는 `/api/` 라우트에서만 호출
- **RLS 우선** — DB 접근은 Supabase RLS로 보안 처리
- **Admin Client** — `createClient` 직접 사용 (RLS 완전 우회), `@supabase/ssr` 사용 금지

## Vision 분석 아키텍처

이미지에서 밑줄·책·페이지번호를 감지하는 세 기능을 독립 Analyzer로 분리하고 VisionOrchestrator가 조합한다.

| 모듈 | 경로 | 역할 |
|------|------|------|
| HighlightAnalyzer | src/lib/vision/analyzers/highlight-analyzer.ts | 형광펜·볼펜·동그라미 등 모든 표시 감지 |
| PageNumberAnalyzer | src/lib/vision/analyzers/page-number-analyzer.ts | OCR 컨텍스트 우선, Vision fallback |
| BookAnalyzer | src/lib/vision/analyzers/book-analyzer.ts | header→footer→claude-text→claude-image 전략 |
| VisionOrchestrator | src/lib/vision/orchestrator.ts | 단일 Claude 호출로 OCR+밑줄+페이지, 책 식별 파이프라인 |

**API 엔드포인트:**

| 엔드포인트 | 역할 |
|-----------|------|
| POST /api/vision/analyze | 전체 파이프라인 (OCR + 밑줄 + 페이지 + 책) |
| POST /api/vision/highlight | 밑줄 감지만 독립 호출 |
| POST /api/vision/book | 책 식별만 독립 호출 |
| POST /api/vision/page | 페이지 번호만 독립 호출 |

## 주요 파일 구조

| 경로 | 역할 |
|------|------|
| src/app/(main)/ | 인증 필요 페이지 그룹 |
| src/app/(auth)/ | 인증 페이지 그룹 (login, signup) |
| src/app/api/ | 서버 전용 API 라우트 |
| src/app/actions/ | Server Actions (auth, underline, profile) |
| src/lib/vision/ | Vision 분석 모듈 |
| src/lib/supabase/ | Supabase 클라이언트 |
| src/components/ui/ | 공통 UI 컴포넌트 |
| src/components/features/ | 기능 컴포넌트 |
| supabase/migrations/ | DB 마이그레이션 SQL 파일 |
| .claude/docs/ | 프로젝트 문서 (LLM wiki) |
