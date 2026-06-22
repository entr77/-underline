# UI/UX 설계 (로컬 참조본)


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
| BookSearchInput | components/features/BookSearchInput.tsx | 카카오 API 책 검색 |
| BookCover | components/ui/BookCover.tsx | 책 표지 + fallback |
| ProfileChip | components/ui/ProfileChip.tsx | 아바타 + 닉네임 |
| TagBadge | components/ui/TagBadge.tsx | 취향 태그 |
| **Alert** | **components/ui/Alert.tsx** | **경고·안내·성공 메시지 — 반드시 이걸 사용** |
| ImageCropRotate | components/features/ImageCropRotate.tsx | 사진 업로드 후 영역 크롭 + 90도 회전 편집 |
| TasteProfile | components/features/TasteProfile.tsx | 행동 기반 취향 성향 표시 — 자주 멈추는 주제(태그) + 선호 장르 |
| TextHighlighter | (미구현) | 밑줄 선택 UI |

## 카드 테마 시스템

공유 카드의 비주얼을 결정하는 테마 프리셋. 각 테마는 배경·레이아웃·타이포그래피를 한 번에 설정한다.

### 테마 목록

| id | 라벨 | 목적 | 비율 | 배경 |
|----|------|------|------|------|
| `book` | 북카드 | 책 자체를 주인공으로 — 책 소개/추천 맥락 | 3:4 | 책 표지 블러 다크 오버레이 |
| `dark` | 다크 | 텍스트 임팩트 극대화 — 에디토리얼 스타일 | 1:1 | 잉크 블랙 #1C1917 단색 |
| `gradient` | 그라디언트 | 빠르게 예쁜 카드 — 장르 무관 범용 고급감 | 1:1 | 네이비 딥블루 CSS 그라디언트 |
| `photo` | 밑줄 | 진정성 최우선 — 실물 책 페이지 사진 배경 | 1:1 | 유저 업로드 사진 풀블리드 |
| `scene` | 포토 | 문장 감정/장면 시각 확장 — 잡지/포토에세이 | 1:1 | Unsplash 검색 사진 풀블리드 |
| `paper` | 페이퍼 | 밝고 클린한 라이트 카드 — 앱 브랜드 컬러 그대로 | 1:1 | 크림 #F7F3EE 단색 |

### 테마별 스펙

#### book (북카드)
- **목적**: 책을 추천하고 싶어서 SNS에 공유하는 독자. "이 책 읽어봐요" 메시지
- **비주얼**: 세로 3:4 판형. 책 표지 블러 다크 배경(brightness 0.58, saturate 0.3) 위에 표지 이미지, guillemet 제목, 하단 인용문 순서
- **사용처**: 인스타 스토리/피드, 책 완독 후 기록, 북클럽 추천 포스팅
- **cardBg**: `cover` | **cardFont**: `serif` | **cardAlign**: `center` | **cardVAlign**: `bottom` | **displayMode**: `full`

#### dark (다크)
- **목적**: 문장 자체의 임팩트를 전달하고 싶은 독자. 짧고 강렬한 문장 공유
- **비주얼**: 정사각형 1:1. 잉크 블랙 #1C1917 단색 배경. 흰 세리프 텍스트 좌측 정렬. 노란 밑줄 바. 하단 좌측 책 표지 썸네일 + 제목. 신문 편집 기사 느낌
- **사용처**: X(트위터) 인용 공유, 인스타 정사각형 피드, 독서 감상 릴스 썸네일
- **cardBg**: `color` (#1C1917) | **cardFont**: `serif` | **cardAlign**: `left` | **cardVAlign**: `center` | **displayMode**: `title` | **showAuthor**: `true`

#### gradient (그라디언트)
- **목적**: 빠르게 예쁜 카드를 뽑고 싶은 독자. 배경 선택이 귀찮을 때
- **비주얼**: 정사각형 1:1. 네이비 딥블루 그라디언트(#1a1a2e → #16213e → #0f3460). 흰 세리프 텍스트 중앙 정렬. 우주/심야 무드
- **사용처**: 인스타 피드 범용 공유, 카카오 채팅 공유, 문학/SF 장르 독자
- **cardBg**: `color` (CSS linear-gradient) | **cardFont**: `serif` | **cardAlign**: `center` | **cardVAlign**: `center` | **displayMode**: `title`

#### photo (밑줄)
- **목적**: 아날로그 독서 감성 SNS 공유. "직접 읽고 있음"을 보여주고 싶을 때
- **비주얼**: 정사각형 1:1. 업로드한 책 페이지 사진 풀블리드 + 하단 강한 다크 그라디언트 오버레이. 노란 밑줄 바. 하단 좌측 텍스트. Bookstagram 손밑줄 감성 디지털화
- **사용처**: 인스타 피드 진정성 포스팅, 밀드라이너 형광펜 독서 인증, 손밑줄 공유
- **cardBg**: `photo` | **cardFont**: `serif` | **cardAlign**: `left` | **cardVAlign**: `bottom` | **displayMode**: `title`

#### scene (포토)
- **목적**: 문장의 감정/장면을 시각적으로 확장. 감성 사진과 문장을 함께 연출
- **비주얼**: 정사각형 1:1. Unsplash 검색 사진 풀블리드 + 검은 반투명 오버레이 + 하단 그라디언트. 흰 세리프 텍스트 중앙. 잡지/포토에세이 레이아웃
- **사용처**: 인스타 라이프스타일 피드, 책 분위기와 맞는 장면 연출, 자연/여행 에세이 독자
- **cardBg**: `search` | **cardFont**: `serif` | **cardAlign**: `center` | **cardVAlign**: `center` | **displayMode**: `title`

#### paper (페이퍼) — P0
- **목적**: 밝고 클린한 라이트 카드. 앱 브랜드 컬러(크림+잉크)를 그대로 카드에 적용. Apple Books 스타일. 인스타 화이트 피드 독자, 낮에 밝은 환경 공유
- **비주얼**: 정사각형 1:1. `var(--color-cream)` #F7F3EE 단색 배경. `var(--color-ink)` #1C1917 텍스트. 좌측 세로선(border-left: 3px solid #1E3A2F) 또는 노란 하이라이트 띠. 여백 충분히. `cardAnimation: 'highlight'`와 조합 시 Apple Books 감성
- **사용처**: 인스타 화이트 피드 공유, 밝은 환경 스크린샷, Apple Books/Kindle 유저 취향
- **cardBg**: `color` (#F7F3EE) | **cardFont**: `serif` | **cardAlign**: `left` | **cardVAlign**: `center` | **displayMode**: `title`

### ThemePreset 타입

```ts
type ThemePreset = {
  id: ThemeId;
  label: string;
  desc: string;
  cardBg: CardBg;          // "cover" | "photo" | "search" | "color" | "none"
  cardBgUrl?: string;      // CSS color/gradient (cardBg === "color" 일 때)
  cardFont: CardFont;      // "serif" | "sans"
  cardAlign: CardAlign;    // "left" | "center" | "right"
  cardVAlign: CardVAlign;  // "top" | "center" | "bottom"
  displayMode: DisplayMode; // "none" | "cover" | "title" | "full"
  showAuthor: boolean;
};
```

### 테마 미니 카드 bgStyle 로직

테마 선택 모달의 미니 카드 배경 스타일:
- `book`: 책 표지 이미지 → fallback `#1a1a1a`
- `dark`: `#1C1917` 단색
- `gradient`: `BG_GRADIENTS[0].css` (달빛 그라디언트)
- `photo`: 업로드한 사진 → fallback `#2a2a2a`
- `scene`: Unsplash 썸네일 → fallback `linear-gradient(135deg, #1a2a3a 0%, #2d4a3a 100%)`
- `paper`: `#F7F3EE` 단색 (텍스트 라인을 어두운 색으로 표시해 가독성 확보)

---

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
