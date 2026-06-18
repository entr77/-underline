# UI/UX 설계 (로컬 참조본)

> 원본: Confluence UI/UX 설계 페이지 (ID: 360619)
> 변경 시 Confluence도 함께 업데이트할 것

## 플랫폼
Mobile First — 375px 기준 설계, 768px(태블릿) / 1280px(데스크탑) 확장

## 정보 구조 (IA)
| 경로 | 페이지 | 인증 필요 |
|------|--------|----------|
| / | 랜딩(비로그인) / 피드(로그인) | - |
| /feed | 밑줄 단위 공개 피드 (태그 필터) | - |
| /books | 책 단위 피드 — 밑줄 수·좋아요 기준 정렬 | - |
| /login | 로그인 | - |
| /signup | 회원가입 | - |
| /onboarding | 최초 1회 닉네임 + 취향 설정 | 필요 |
| /new | 밑줄 추가 (멀티스텝) | 필요 |
| /underline/[id] | 밑줄 상세 | - |
| /book/[id] | 책 상세 — 해당 책의 모든 밑줄 + 페이지 히트맵 | - |
| /profile/[username] | 유저 프로필 | - |
| /settings | 설정 | 필요 |

## 네비게이션
BottomNav 4탭: **홈(/) · 피드(/feed) · 책(/books) · 내 프로필**

## 핵심 유저 플로우

### 밑줄 추가 (핵심 플로우)
1. 사진 업로드 (카메라/갤러리)
2. **크롭 / 회전 편집** — 드래그로 영역 선택, 좌/우 90도 회전 (건너뛰기 가능)
3. 처리 중 (OCR + 책 인식 + 밑줄 감지 병렬)
4-a. 책 정보 확인 (자동 인식, 수정 가능)
4-b. 밑줄 선택 (자동 감지 하이라이트 + 수동 수정)
5. 완료 → 피드 이동

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
| UnderlineCard | components/features/UnderlineCard.tsx | 밑줄 피드 카드 |
| UnderlineGroupCard | components/features/UnderlineGroupCard.tsx | 같은 이미지 밑줄 묶음 카드 |
| BookFeedCard | components/features/BookFeedCard.tsx | 책 단위 피드 카드 (/books용) |
| ShareCardButton | components/features/ShareCardButton.tsx | 밑줄 → 인스타 이미지 카드 생성/저장 |
| LikeButton | components/features/LikeButton.tsx | 좋아요 토글 (optimistic update) |
| DeleteUnderlineButton | components/features/DeleteUnderlineButton.tsx | 밑줄 삭제 (작성자 전용) |
| FeedFilter | components/features/FeedFilter.tsx | 피드 태그 필터 |
| BookSearchInput | components/features/BookSearchInput.tsx | 카카오 API 책 검색 |
| BookCover | components/ui/BookCover.tsx | 책 표지 + fallback |
| ProfileChip | components/ui/ProfileChip.tsx | 아바타 + 닉네임 |
| TagBadge | components/ui/TagBadge.tsx | 취향 태그 |
| **Alert** | **components/ui/Alert.tsx** | **경고·안내·성공 메시지 — 반드시 이걸 사용** |
| ImageCropRotate | components/features/ImageCropRotate.tsx | 사진 업로드 후 영역 크롭 + 90도 회전 편집 |
| TextHighlighter | (미구현) | 밑줄 선택 UI |

## Alert 컴포넌트 규칙

> **경고창·안내창·오류·성공 메시지는 반드시 `<Alert>`를 사용한다. 인라인 div로 직접 스타일링 금지.**

```tsx
import Alert from "@/components/ui/Alert";

<Alert variant="error">저장에 실패했습니다.</Alert>
<Alert variant="warning" title="주의">이 작업은 되돌릴 수 없어요.</Alert>
<Alert variant="info">이메일을 확인해주세요.</Alert>
<Alert variant="success">밑줄이 저장됐어요.</Alert>
```

| prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `variant` | `"error" \| "warning" \| "info" \| "success"` | `"info"` | 색상·아이콘 결정 |
| `title` | `string` | — | 굵은 제목 (선택) |
| `children` | `ReactNode` | 필수 | 본문 메시지 |
