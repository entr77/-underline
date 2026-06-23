@AGENTS.md
@.claude/memory/MEMORY.md
@.claude/docs/prd.md
@.claude/docs/ux-design.md
@.claude/docs/dev-routine.md
@.claude/docs/db-schema.md
@.claude/docs/tech-stack.md
@.claude/docs/marketing-research.md
@.claude/docs/bizplan-2026-ai-support.md

# 밑줄 (Underline) 프로젝트

책을 읽다 밑줄 친 문장을 기록하고 공유하는 소셜 독서 플랫폼.

## 기술 스택

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **DB/Auth/Storage**: Supabase (PostgreSQL + RLS)
- **OCR / 이미지 분석**: Claude Vision API (claude-sonnet-4-6)
- **책 검색**: 카카오 도서 API
- **배포**: Vercel

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
KAKAO_REST_API_KEY=
ANTHROPIC_API_KEY=
```

## 주요 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 로그인 전: 랜딩, 로그인 후: 공개 피드 |
| `/feed` | 밑줄 단위 공개 피드 |
| `/books` | 책 단위 피드 |
| `/login` | 이메일 / Google 로그인 |
| `/signup` | 이메일 회원가입 |
| `/new` | 밑줄 추가 (텍스트 입력 또는 사진 OCR) |
| `/underline/[id]` | 밑줄 상세 |
| `/profile/[username]` | 유저 프로필 |
| `/book/[id]` | 책별 밑줄 목록 |

## DB 테이블

- `users` — Supabase Auth 확장, 프로필 정보
- `books` — 카카오 API ISBN 기반 책 정보
- `underlines` — 밑줄 친 문장 (핵심 테이블)
- `likes` — 밑줄 좋아요 (user_id + underline_id UNIQUE)
- `user_taste_profiles` — 행동 기반 취향 프로파일 (트리거 자동 집계)

## 플랫폼 정책

- **Mobile First** — 모든 UI/UX 설계와 개발은 모바일 기준으로 먼저 설계하고, 데스크탑은 확장
- 기본 타겟 뷰포트: **375px** (모바일), 확장: 768px (태블릿), 1280px (데스크탑)
- 사진 촬영, 터치 인터랙션 등 모바일 네이티브 UX를 우선 고려
- 카메라 접근, 파일 업로드는 모바일 브라우저 기준으로 구현

## 워크스페이스 정책

- **모든 파일은 `/Users/entr/Documents/GitHub/underline/` 안에서만 생성/관리** — 외부 경로 사용 금지
- **Git worktree도 워크스페이스 하위에서만 운영** (예: `.worktrees/feature-xxx`)
- 임시 파일, JSON 페이로드 등도 워크스페이스 내 `.tmp/` 에 저장
- 자동화 스크립트는 `.claude/scripts/` 에 저장
- GitHub으로 버전 관리 — 커밋 전 `.env.local` 등 민감 파일 `.gitignore` 확인

## 문서 정책 (LLM Wiki)

모든 기획·설계·기술 문서는 `.claude/docs/` 에서 관리한다. Confluence는 사용하지 않는다.

| 문서 | 파일 | 내용 |
|------|------|------|
| 서비스 기획 | `.claude/docs/prd.md` | PRD, MVP 기능, 로드맵 |
| UI/UX 설계 | `.claude/docs/ux-design.md` | 페이지 구조, 컴포넌트, 디자인 시스템 |
| DB 스키마 | `.claude/docs/db-schema.md` | 테이블 구조, RLS, 트리거, 마이그레이션 |
| 기술 스택 | `.claude/docs/tech-stack.md` | 기술 선택, 외부 API, 환경변수, 아키텍처 |
| 개발 루틴 | `.claude/docs/dev-routine.md` | 작업 유형별 루틴, 금지 사항 |
| 마케팅 리서치 | `.claude/docs/marketing-research.md` | SNS 독서 문화, 시장 분석 |

**문서 업데이트 규칙:**
- 기능 추가/변경 시 관련 문서를 코드와 함께 업데이트
- DB 스키마 변경 시 `db-schema.md` 마이그레이션 목록 업데이트
- 새 컴포넌트 추가 시 `ux-design.md` 컴포넌트 표 업데이트

## 에이전트 역할

| 에이전트 | 파일 | 역할 |
|---------|------|------|
| `planner` | `.claude/agents/planner.md` | 서비스 기획, 유저 스토리, PRD 작성 |
| `designer` | `.claude/agents/designer.md` | 화면 설계, 컴포넌트 스펙, 디자인 시스템 |
| `developer` | `.claude/agents/developer.md` | 코드 구현, DB 마이그레이션, API 연동 |
| `reviewer` | `.claude/agents/reviewer.md` | 코드 리뷰, 보안 검토, RLS 검증 |
| `marketer` | `.claude/agents/marketer.md` | 캠페인 설계, 유저 인사이트 분석, 그로스 전략 |
| `legal` | `.claude/agents/legal.md` | 저작권·개인정보·이용약관·규제 준수 검토 |
| `grant-expert` | `.claude/agents/grant-expert.md` | 정부 지원사업 공고 분석, 사업계획서 작성·검토 |

### 에이전트 작업 시작 전 체크
1. `.claude/docs/` 관련 문서 최신 내용 확인
2. `CLAUDE.md` 정책과 충돌하는 작업인지 검토
3. 이전 에이전트의 결과물 확인

## 개발 정책

- API Route Handler는 `/src/app/api/` 하위에 작성 (카카오 키, Vision API 키는 서버에서만 호출)
- Supabase 접근은 RLS로 보안 처리 — service role key는 서버에서만 사용
- 컴포넌트는 Server Component 기본, 인터랙션 필요한 경우만 `"use client"`
