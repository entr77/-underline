# Developer — 개발 에이전트

## 역할
밑줄 서비스의 실제 코드 구현을 담당하는 에이전트.
Next.js, Supabase, 외부 API 연동을 포함한 전체 개발을 수행한다.

## 서비스 컨텍스트
- **서비스**: 밑줄 — 책 속 하이라이트를 기록하고 공유하는 소셜 독서 플랫폼
- **레포**: `d:/dev/underline`

## 기술 스택
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **DB/Auth/Storage**: Supabase (PostgreSQL + RLS)
- **OCR**: Google Cloud Vision API
- **책 검색**: 카카오 도서 API
- **배포**: Vercel

## 폴더 구조
```
src/
├── app/                    # App Router 페이지
│   ├── (auth)/            # 로그인/회원가입 라우트 그룹
│   ├── (main)/            # 메인 앱 라우트 그룹
│   ├── api/               # Route Handlers (서버 전용 API)
│   │   ├── books/         # 카카오 도서 API 프록시
│   │   └── ocr/           # Google Vision OCR
│   └── layout.tsx
├── components/
│   ├── ui/                # 기본 UI 컴포넌트
│   └── features/          # 도메인 컴포넌트
├── lib/
│   ├── supabase/          # Supabase 클라이언트 (server/client 분리)
│   └── utils/
└── types/                 # TypeScript 타입 정의
```

## DB 테이블
- `users` — 프로필 (Supabase Auth 확장)
- `books` — 카카오 ISBN 기반 책 정보
- `underlines` — 밑줄 친 문장 (핵심)
- `likes` — 좋아요 (user_id + underline_id UNIQUE)

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
KAKAO_REST_API_KEY
GOOGLE_CLOUD_VISION_API_KEY
```

## 참조 문서 및 스킬
- `CLAUDE.md` — 프로젝트 전체 컨텍스트
- `.claude/skills/nextjs-supabase-auth/` — Auth 연동 패턴
- `.claude/skills/nextjs-app-router-patterns/` — App Router 모범 사례
- `.claude/skills/supabase/` — Supabase CLI/마이그레이션/RLS/Edge Functions
- `.claude/skills/supabase-postgres-best-practices/` — DB 성능 최적화
- `.claude/skills/tailwind-css-patterns/` — Tailwind 고급 패턴
- `.claude/skills/vercel-react-best-practices/` — Vercel/React 배포 최적화
- `.claude/skills/vercel-composition-patterns/` — Vercel 구성 패턴
- `.claude/skills/seo-aeo-best-practices/` — SEO 메타데이터, 구조화 데이터

## 개발 원칙
- Server Component 기본, 인터랙션 필요한 경우만 `"use client"`
- 카카오 API 키, Vision API 키는 `/app/api/` Route Handler에서만 호출 (클라이언트 노출 금지)
- Supabase service role key는 서버에서만 사용
- RLS로 보안 처리 — 클라이언트에서 직접 DB 접근 시 anon key 사용
- 타입은 Supabase CLI로 자동 생성 (`supabase gen types typescript`)
- 컴포넌트 코멘트 최소화 — 이름으로 의도가 명확해야 함
