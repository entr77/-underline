# UI/UX 설계 (로컬 참조본)

> 원본: Confluence UI/UX 설계 페이지 (ID: 360619)
> 변경 시 Confluence도 함께 업데이트할 것

## 플랫폼
Mobile First — 375px 기준 설계, 768px(태블릿) / 1280px(데스크탑) 확장

## 정보 구조 (IA)
| 경로 | 페이지 | 인증 필요 |
|------|--------|----------|
| / | 랜딩(비로그인) / 피드(로그인) | - |
| /login | 로그인 | - |
| /signup | 회원가입 | - |
| /onboarding | 최초 1회 닉네임 + 취향 설정 | 필요 |
| /new | 밑줄 추가 (멀티스텝) | 필요 |
| /underline/[id] | 밑줄 상세 | - |
| /book/[id] | 책 상세 — 해당 책의 모든 밑줄 | - |
| /profile/[username] | 유저 프로필 | - |
| /settings | 설정 | 필요 |

## 핵심 유저 플로우

### 밑줄 추가 (핵심 플로우)
1. 사진 업로드 (카메라/갤러리)
2. 처리 중 (OCR + 책 인식 + 밑줄 감지 병렬)
3-a. 책 정보 확인 (자동 인식, 수정 가능)
3-b. 밑줄 선택 (자동 감지 하이라이트 + 수동 수정)
4. 완료 → 피드 이동

### 밑줄 감지 방식
- 전체 텍스트 OCR 추출
- 이미지 분석으로 밑줄/형광펜 위치 자동 감지
- 감지 위치를 텍스트 블록과 매핑
- 사용자가 결과 확인 + 수동 수정/추가 가능

## 디자인 시스템

### 컬러
| 토큰 | 값 | 용도 |
|------|-----|------|
| --color-cream | #F7F3EE | 배경 |
| --color-cream-dark | #EDE8E1 | 보조 배경 |
| --color-ink | #1C1917 | 주 텍스트 |
| --color-ink-muted | #6B6560 | 보조 텍스트 |
| --color-ink-faint | #A8A29E | 힌트/플레이스홀더 |
| --color-forest | #1E3A2F | 주 강조색 (CTA, 액션) |
| --color-forest-light | #2D5A3D | hover 상태 |
| --color-border | #E4DDD6 | 테두리 |
| --color-highlight | #FFF3B0 | 밑줄 하이라이트 |

### 타이포그래피
- **본문 콘텐츠 (밑줄 문장)**: Noto Serif KR — font-serif 클래스
- **UI 요소**: Noto Sans KR — 기본
- **폰트 변수**: `--font-serif`, `--font-sans`

### 레이아웃
- 모바일 컨테이너: `max-w-[430px] mx-auto`
- 헤더 높이: `h-14` sticky
- 페이지 패딩: `px-4` 또는 `px-5`

## 핵심 컴포넌트
| 컴포넌트 | 경로 | 설명 |
|---------|------|------|
| UnderlineCard | components/features/UnderlineCard.tsx | 피드 카드 |
| BookCover | components/ui/BookCover.tsx | 책 표지 + fallback |
| ProfileChip | components/ui/ProfileChip.tsx | 아바타 + 닉네임 |
| TagBadge | components/ui/TagBadge.tsx | 취향 태그 |
| TextHighlighter | (미구현) | 밑줄 선택 UI |
| BookSearchInput | (미구현) | 카카오 API 책 검색 |
| PageHeatmap | (미구현) | 페이지별 밀도 시각화 |
