@AGENTS.md
@.claude/memory/MEMORY.md
@.claude/docs/prd.md
@.claude/docs/ux-design.md
@.claude/docs/dev-routine.md

# 밑줄 (Underline) 프로젝트

책을 읽다 밑줄 친 문장을 기록하고 공유하는 소셜 독서 플랫폼.

## 기획 문서

Confluence: https://underline2026.atlassian.net/wiki/spaces/23YCjdNKjqwx
- PRD: 서비스 개요, 핵심 가치, 타겟 유저, MVP 기능 명세
- UI/UX 설계: 페이지 구조, 주요 컴포넌트, 디자인 방향
- DB 스키마: 테이블 구조, RLS 정책
- 기술 스택 & 아키텍처: 기술 선택 근거, 외부 API, 환경변수 목록

## 기술 스택

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **DB/Auth/Storage**: Supabase (PostgreSQL + RLS)
- **OCR**: Google Cloud Vision API
- **책 검색**: 카카오 도서 API
- **배포**: Vercel

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
KAKAO_REST_API_KEY=
GOOGLE_CLOUD_VISION_API_KEY=
```

## 주요 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 로그인 전: 랜딩, 로그인 후: 공개 피드 |
| `/login` | 이메일 / Google 로그인 |
| `/signup` | 이메일 회원가입 |
| `/new` | 밑줄 추가 (텍스트 입력 또는 사진 OCR) |
| `/underline/[id]` | 밑줄 상세 |
| `/profile/[username]` | 마이페이지 |
| `/book/[id]` | 책별 밑줄 목록 |

## DB 테이블

- `users` — Supabase Auth 확장, 프로필 정보
- `books` — 카카오 API ISBN 기반 책 정보
- `underlines` — 밑줄 친 문장 (핵심 테이블)
- `likes` — 밑줄 좋아요 (user_id + underline_id UNIQUE)

## 플랫폼 정책

- **Mobile First** — 모든 UI/UX 설계와 개발은 모바일 기준으로 먼저 설계하고, 데스크탑은 확장
- 기본 타겟 뷰포트: **375px** (모바일), 확장: 768px (태블릿), 1280px (데스크탑)
- 사진 촬영, 터치 인터랙션 등 모바일 네이티브 UX를 우선 고려
- 카메라 접근, 파일 업로드는 모바일 브라우저 기준으로 구현

## 워크스페이스 정책

- **모든 파일은 `d:/dev/underline/` 안에서만 생성/관리** — 외부 경로(tmp 등) 사용 금지
- **Git worktree도 `d:/dev/underline/` 하위에서만 운영** (예: `d:/dev/underline/.worktrees/feature-xxx`)
- 임시 파일, JSON 페이로드 등도 워크스페이스 내 `.tmp/` 에 저장
- GitHub으로 버전 관리 — 커밋 전 `.env.local` 등 민감 파일 `.gitignore` 확인

## 에이전트 역할 및 협업 정책

### 에이전트 구성
| 에이전트 | 파일 | 역할 |
|---------|------|------|
| `planner` | `.claude/agents/planner.md` | 서비스 기획, 유저 스토리, PRD 작성 |
| `designer` | `.claude/agents/designer.md` | 화면 설계, 컴포넌트 스펙, 디자인 시스템 |
| `developer` | `.claude/agents/developer.md` | 코드 구현, DB 마이그레이션, API 연동 |
| `reviewer` | `.claude/agents/reviewer.md` | 코드 리뷰, 보안 검토, RLS 검증 |
| `pm` | `.claude/agents/pm.md` | **오케스트레이터** — 요청 분석 및 에이전트 위임, 태스크 분해, 일정 산정, Confluence 문서화 |

### 작업 흐름
```
요청 접수(PM)
  → 기획 확정(Planner) → Confluence PRD 업데이트
  → 화면 설계(Designer) → Confluence UI/UX 업데이트
  → 개발(Developer) → 코드 구현
  → 리뷰(Reviewer) → 수정 사항 전달
  → 배포
```

### Confluence 문서화 규칙
- **Planner** 작업 완료 시: PRD 페이지 업데이트 필수
- **Designer** 작업 완료 시: UI/UX 설계 페이지 업데이트 필수
- **DB 스키마 변경** 시: DB 스키마 페이지 업데이트 필수
- **기술 스택 변경** 시: 기술 스택 & 아키텍처 페이지 업데이트 필수
- Confluence API: `curl -u "entr.kim@gmail.com:{TOKEN}" https://underline2026.atlassian.net/wiki/rest/api/content`

### Confluence 페이지 ID
| 페이지 | ID |
|--------|-----|
| PRD - 서비스 기획서 | 164058 |
| UI/UX 설계 | 360619 |
| DB 스키마 | 589825 |
| 기술 스택 & 아키텍처 | 622593 |

### 에이전트 작업 시작 전 체크
1. Confluence에서 관련 페이지 최신 내용 확인
2. `CLAUDE.md` 정책과 충돌하는 작업인지 검토
3. 이전 에이전트의 결과물 확인

## 개발 정책

- 기획 변경 사항은 Confluence 먼저 업데이트 후 개발 진행
- API Route Handler는 `/src/app/api/` 하위에 작성 (카카오 키, Vision API 키는 서버에서만 호출)
- Supabase 접근은 RLS로 보안 처리 — service role key는 서버에서만 사용
- 컴포넌트는 Server Component 기본, 인터랙션 필요한 경우만 `"use client"`
