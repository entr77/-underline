# 교차 검증: Designer x Developer — 디자인-개발 인터페이스 계약

> 작성: Designer + Developer 교차 검증 에이전트 | 날짜: 2026-06-22
> `designer-policy.md`, `developer-policy.md`, `ux-design.md`, 실제 컴포넌트 파일 분석 기반.
> 디자인-코드 불일치 발견 시 이 문서에 즉시 기록하고 수정 담당자를 명시한다.

---

## 디자인 토큰 → CSS 변수 사용 규칙

### 현재 정의된 토큰 목록 (globals.css @theme inline)

| CSS 변수 | 값 | Tailwind 클래스 |
|---|---|---|
| `--color-cream` | #F7F3EE | `bg-[var(--color-cream)]`, `text-[var(--color-cream)]` |
| `--color-cream-dark` | #EDE8E1 | `bg-[var(--color-cream-dark)]` |
| `--color-ink` | #1C1917 | `text-[var(--color-ink)]` |
| `--color-ink-muted` | #6B6560 | `text-[var(--color-ink-muted)]` |
| `--color-ink-faint` | #A8A29E | `text-[var(--color-ink-faint)]` |
| `--color-forest` | #1E3A2F | `bg-[var(--color-forest)]`, `text-[var(--color-forest)]` |
| `--color-forest-light` | #2D5A3D | `bg-[var(--color-forest-light)]` |
| `--color-border` | #E4DDD6 | `border-[var(--color-border)]` |
| `--color-highlight` | #FDE047 | `bg-[var(--color-highlight)]` |
| `--font-serif` | var(--font-noto-serif-kr) | `font-serif` 클래스 |
| `--font-sans` | var(--font-noto-sans-kr) | 기본 body 폰트 |

> **주의**: globals.css에서 `--color-highlight`는 `#FDE047`로 정의되어 있으나, `ux-design.md`에는 `#FFF3B0`으로 기록되어 있다. 실제 코드 기준값은 `#FDE047`이다. (아래 불일치 섹션 참조)

### 어떤 경우에도 하드코딩 금지 목록

| 금지 패턴 | 올바른 대안 |
|---|---|
| `color: #1C1917` | `text-[var(--color-ink)]` |
| `color: #F7F3EE` | `text-[var(--color-cream)]` (또는 `bg-[var(--color-cream)]`) |
| `background: #1E3A2F` | `bg-[var(--color-forest)]` |
| `border-color: #E4DDD6` | `border-[var(--color-border)]` |
| `font-family: 'Noto Serif KR'` 인라인 | `font-serif` 클래스 |
| `font-family: 'Noto Sans KR'` 인라인 | 기본(body 상속) 또는 `font-sans` |
| `margin: 13px`, `padding: 7px` | Tailwind scale (`m-3`, `p-2`) 또는 4px 배수 |
| `@media (max-width: 430px)` | `sm:`, `md:`, `lg:` 또는 `max-w-[430px]` 컨테이너 패턴 |
| `z-index: 999` | `z-10`, `z-20`, `z-50` 중 목적에 맞는 값 |

**예외 허용 케이스:**
- 공유 카드 내부 CSS-in-canvas 렌더링(html-to-image) 시 HEX 직접 사용 허용 — CORS 제약으로 CSS 변수가 캔버스에서 해석되지 않음.
- `bg-[#1C1917]` 형태의 Tailwind arbitrary value는 토큰 미정의 1회성 값에 한해 허용. 단, 동일 값이 2곳 이상에 나타나면 즉시 토큰화.
- 카드 애니메이션 `strokeDasharray`, `strokeDashoffset` 등 SVG 속성의 수치값.

### 토큰 미정의 케이스 처리 방법

1. 신규 색상이 1회성(특정 컴포넌트 전용)이면 arbitrary value 허용 + 인라인 주석으로 용도 명시.
2. 동일 색상이 2개 이상 컴포넌트에서 사용되거나 Designer가 재사용을 명시했으면 `globals.css @theme inline`에 토큰 추가 후 사용.
3. 토큰 추가 시 `ux-design.md` 컬러 테이블도 즉시 업데이트.
4. 그라디언트(gradient 테마의 네이비 딥블루 등)는 토큰화하지 않고 `card_bg_url`에 CSS gradient string으로 저장 — 카드 데이터 레이어에서 관리.

---

## 컴포넌트 Props 계약

### Designer가 반드시 명시해야 할 Props

| 분류 | 내용 |
|---|---|
| 비주얼 variant | `variant`, `size`, `theme` 등 외형을 결정하는 모든 props |
| 상태 표현 | `loading`, `disabled`, `error` 상태 각각의 시각적 명세 |
| 빈 상태 문구 | 데이터 없을 때 표시할 한국어 문구 (기계적 표현 금지) |
| 최장/최단 텍스트 케이스 | 인용문 200자, 책 제목 30자, 닉네임 2자 등 극단값 레이아웃 |
| 터치 타겟 크기 | 44x44px 미만인 경우 padding 확보 방법 명시 |
| aria-label 패턴 | 버튼·링크·이미지의 스크린리더 레이블 |

### Developer가 자율 결정 가능한 Props

| 분류 | 내용 |
|---|---|
| 내부 state 구조 | `useState` 구성, optimistic update 방식 |
| 성능 최적화 | `useTransition`, `IntersectionObserver`, lazy loading 적용 여부 |
| 이벤트 핸들러 시그니처 | `onClick` 내부 구현, `stopPropagation` 위치 |
| TypeScript 타입 세부 | 내부 헬퍼 함수 타입, 로컬 타입 별칭 |
| ref 사용 여부 | `useRef`로 DOM 직접 접근할지 여부 |
| 동적 임포트 여부 | `next/dynamic` 적용 여부 (성능 판단 Developer 재량) |

### 변경 시 Designer 재검토 필요한 Props

다음 Props를 변경하면 반드시 Designer에게 검토 요청 후 진행:

| Props | 이유 |
|---|---|
| `variant` 값 추가/제거 | 디자인 시스템 일관성 영향 |
| `size` 값 추가/제거 | 타 컴포넌트와의 스케일 불일치 가능 |
| 카드 테마 관련 Props (`card_bg`, `card_font`, `card_align`, `card_valign`, `display_mode`) | 공유 카드 비주얼 전체 변경 |
| `compact` prop 동작 변경 | 피드 레이아웃 밀도에 영향 |
| 인용문 truncate 기준 변경 | 디자인 정책(`line-clamp-3` 등) 변경에 해당 |
| Alert `variant` 추가 | 디자인 시스템 컬러 팔레트 확장 |

---

## 반응형 계약

### 375px (모바일): 반드시 완성 기준

- 모든 컴포넌트의 1차 설계·구현 대상.
- 컨테이너: `max-w-[430px] mx-auto`.
- 피드 카드: 단일 열, 전체 너비.
- BottomNav: `h-14` (56px), 4탭 균등 분할.
- 입력 필드: 최소 `h-11` (44px).
- 모달/시트: 화면 전체 또는 하단 바텀시트.

### 768px (태블릿): 권장 대응 기준

- 피드 카드: 2열 그리드 전환 권장 (`sm:grid-cols-2`).
- 사이드 여백 확장: `sm:px-8` 이상.
- 모달: 중앙 다이얼로그로 전환 권장 (현재 미구현).
- "변화 없음"이면 Designer가 명시적으로 "모바일과 동일"을 스펙에 기재해야 한다 — 묵시적 생략 금지.

### 1280px (데스크탑): 선택 대응 기준

- 피드: `max-w-[430px]` 단일 컬럼 중앙 유지 권장 (읽기 집중).
- 네비게이션: 현재 BottomNav 그대로 유지 — 사이드바 전환은 P2 이후 검토.
- 데스크탑 전용 기능 금지 — 모바일에서 안 되는 기능은 데스크탑에서도 제공 안 함.

### 분기점별 레이아웃 변경 범위

| 분기 | Tailwind prefix | 컨테이너 | 카드 | 네비게이션 |
|---|---|---|---|---|
| 375px 모바일 | 기본 (무접두) | `max-w-[430px]` | 1열 | BottomNav |
| 768px 태블릿 | `sm:` | 동일 | 2열 권장 | BottomNav 유지 |
| 1280px 데스크탑 | `lg:` | 동일 | 2~3열 선택 | BottomNav 유지 |

---

## 애니메이션/트랜지션 계약

### 표준 duration 및 easing 값

| 용도 | duration | easing | 구현 |
|---|---|---|---|
| 색상 전환 (hover, 탭 상태) | 150ms | ease-out | `transition-colors duration-150` |
| 카드 페이드업 (인용문 등장) | 400ms | ease-out | `@keyframes fade-up` (globals.css) |
| 밑줄 바 드로우 애니메이션 | 450ms | ease-out | `@keyframes underline-draw` (globals.css) |
| SVG 밑줄 드로우 | 700ms | ease-out | `transition: stroke-dashoffset 0.7s ease-out 0.1s` |
| 하이라이트 스윕 (highlight 모드) | 800ms | ease-out | `transition: background-size 0.8s ease-out 0.2s` |
| 버튼/뱃지 상태 전환 | 150ms | ease-out | `transition-colors` |

**현재 정의된 keyframes (globals.css):**
```css
@keyframes underline-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

새 keyframe 추가 시 반드시 `globals.css`에 등록한다. 인라인 `style={{ animation: "..." }}`에 정의되지 않은 keyframe 이름을 직접 참조하지 않는다.

### prefers-reduced-motion 대응 기준

현재 코드베이스는 `prefers-reduced-motion`을 명시적으로 처리하지 않는다. 이는 **개선 필요 사항**이다.

**현재 허용 상태**: 밑줄 드로우, fade-up 애니메이션이 모션 감소 설정과 무관하게 실행됨.

**향후 적용 기준**:
- `globals.css`에 `@media (prefers-reduced-motion: reduce)` 블록 추가.
- `underline-draw`, `fade-up` keyframe을 motion-safe 조건으로 감싸거나, `animation: none`으로 오버라이드.
- `IntersectionObserver` 기반 진입 트리거는 유지하되 애니메이션 duration을 0으로 설정.

```css
/* globals.css에 추가 권장 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 밑줄 서비스에서 허용하는 애니메이션 범위

**허용:**
- `transition-colors`, `transition-opacity` — UI 상태 피드백
- `underline-draw`, `fade-up` — 카드 진입 시 한 번 실행되는 단발 애니메이션
- 하이라이트 스윕 (`background-size` 트랜지션)
- SVG path `stroke-dashoffset` 드로우
- `animate-pulse` — Skeleton 로딩 UI

**금지:**
- 루핑(looping) 애니메이션 (스피너 제외)
- 스크롤 기반 parallax
- 카드 hover 시 3D transform (`perspective`, `rotateX/Y`)
- 자동 슬라이드/캐러셀 (사용자 제어 없는 자동 전환)
- `transition-all` (성능 저하, 의도치 않은 속성 전환)

---

## 신규 컴포넌트 추가 워크플로우

### Designer → Developer 인계 필수 제공 항목

```
[ ] 컴포넌트명 및 위치 (ui/ 또는 features/)
[ ] Props 타입 정의 (TypeScript 기준 전체)
[ ] 모든 variant 목록 및 각 variant의 시각적 명세
[ ] 상태별 설계: idle / loading / empty / error / disabled
[ ] 반응형 명세: 375px 필수 + 768px·1280px (변화 없으면 "모바일과 동일" 명시)
[ ] 터치 타겟 44px 확보 방법 명시
[ ] aria-label 패턴
[ ] 최장/최단 텍스트 케이스 확인
[ ] Alert 사용이 필요한 케이스 지정
[ ] 의존 컴포넌트 목록
[ ] 실제 한국어 콘텐츠로 작성된 사용 예시
```

### Developer가 Designer 재검토 요청해야 하는 케이스

| 케이스 | 이유 |
|---|---|
| 스펙에 없는 상태(state)가 구현 중 필요해진 경우 | 빈 상태·에러 상태 문구·시각화 결정 필요 |
| 인용문 truncate 기준 변경이 불가피한 경우 | 정보 계층 설계 변경에 해당 |
| 새로운 색상 조합이 필요하고 기존 토큰으로 표현 불가한 경우 | 토큰 추가 여부 결정 필요 |
| 터치 타겟 44px 확보 시 레이아웃이 크게 변하는 경우 | 정렬·여백 조정 결정 필요 |
| 모달/바텀시트가 아닌 새로운 오버레이 패턴이 필요한 경우 | 패턴 표준화 필요 |
| 접근성 요구사항으로 마크업 구조가 디자인 의도와 달라져야 하는 경우 | 디자인 의도 vs 접근성 트레이드오프 결정 |

### 빠른 구현을 위한 허용된 디자인 편의 범위

Developer는 다음 항목에 한해 Designer 확인 없이 자율 결정할 수 있다:

- `text-[11px]`, `text-[10px]` 등 Tailwind 표준 이외의 미세 폰트 크기 — 단 12px 이하 금지 원칙 준수.
- `gap-2.5`, `gap-1.5` 등 0.5 단위 스페이싱 — 전체 시각 구조에 영향 없는 범위.
- `rounded-[2px]`, `rounded-[3px]` 등 소형 요소의 미세 라운드.
- Skeleton 로딩 UI의 정확한 높이 — 실제 카드 평균 높이와 ±10% 이내이면 허용.
- SVG 아이콘 내부 path 세부 — 동일 의미의 아이콘이면 미세 형태 차이 허용.

---

## 현재 컴포넌트 디자인-코드 불일치 사항

> 실제 파일 분석 기반. 심각도: High(기능/접근성 영향) / Medium(디자인 일관성 영향) / Low(문서 정합성 이슈)

---

### 1. `--color-highlight` 값 불일치 [심각도: Medium]

- **문서(ux-design.md)**: `#FFF3B0`
- **실제 코드(globals.css)**: `#FDE047`
- **영향**: paper 테마 미니 카드, 포커스 링 fallback 색상 설계 기준이 다름.
- **해결**: globals.css의 `#FDE047`가 실제 렌더링 기준. ux-design.md의 `--color-highlight` 값을 `#FDE047`로 수정.
- **담당**: Developer (globals.css 수정) + Designer (ux-design.md 업데이트)

---

### 2. `BookCover` — `next/image` 미사용 [심각도: Medium]

- **정책(developer-policy.md)**: 책 표지(`cover_url`)는 next/image 필수.
- **실제 코드(BookCover.tsx)**: `<img src={src} ...>` 사용.
- **영향**: 카카오 CDN 이미지 최적화(lazy load, WebP 변환) 미적용. LCP 성능 저하 가능.
- **해결**: `next/image`로 교체 시 `width`, `height` 또는 `fill` + `sizes` 필요. BookCover의 `size` prop 값에 따라 고정 크기 지정 필요.
  - `sm`: width={36} height={48}
  - `md`: width={48} height={64}
  - `lg`: width={80} height={112}
- **담당**: Developer

---

### 3. `ProfileChip` — `next/image` 미사용 [심각도: Medium]

- **정책(developer-policy.md)**: 아바타(`avatar_url`)는 next/image 필수.
- **실제 코드(ProfileChip.tsx)**: `<img src={user.avatar_url} ...>` 사용.
- **영향**: 아바타가 목록에서 반복 렌더링될 때 최적화 미적용.
- **해결**: `next/image`로 교체. `sm`(24px), `md`(32px) 고정 크기 지정.
- **담당**: Developer

---

### 4. `UnderlineCard` — 카드 내부 `<img>` 직접 사용 [심각도: Medium]

- **정책(developer-policy.md)**: 책 표지 및 유저 업로드 이미지는 next/image 필수.
- **실제 코드(UnderlineCard.tsx L131, L328)**: `/* eslint-disable-next-line @next/next/no-img-element */`와 함께 `<img>`를 직접 사용.
- **이유(코드 내 추정)**: html-to-image(캔버스 캡처)와의 호환성 우려.
- **판단**: 캐러셀 내 일반 피드 렌더링에서는 next/image를 사용하고, ShareCardButton 내 프록시 렌더링 전용 컴포넌트만 `<img>`를 허용하는 구조로 분리하는 것이 적합.
- **담당**: Developer (분리 여부 검토 후 결정)

---

### 5. `LikeButton` — aria-label 누락 [심각도: High]

- **정책(designer-policy.md)**: `aria-label={isLiked ? '좋아요 취소 (현재 ${count}개)' : '좋아요 (현재 ${count}개)'}` + `aria-pressed={isLiked}` 필수.
- **실제 코드(LikeButton.tsx)**: `aria-label`, `aria-pressed` 모두 없음.
- **영향**: 스크린리더 사용자가 버튼 기능을 알 수 없음.
- **해결**:
```tsx
<button
  aria-label={liked ? `좋아요 취소 (현재 ${count}개)` : `좋아요 (현재 ${count}개)`}
  aria-pressed={liked}
  ...
>
```
- **담당**: Developer

---

### 6. `TagBadge` — `aria-label` 및 `aria-pressed` 누락 [심각도: Medium]

- **상황**: TagBadge는 선택/비선택 상태가 있는 토글 버튼이다.
- **실제 코드(TagBadge.tsx)**: `aria-pressed`, `aria-label` 없음.
- **해결**: `aria-pressed={selected ?? false}` 추가. `onClick`이 없을 때(정보 표시 전용)는 `<button>` 대신 `<span>`으로 변경하거나 `role="none"` 적용.
- **담당**: Developer

---

### 7. `UnderlineCard` — `<article>` aria-label 누락 [심각도: Medium]

- **정책(designer-policy.md)**: `aria-label="{author}님의 밑줄 — {bookTitle}: "{quote.slice(0,30)}…"` 패턴 필수.
- **실제 코드(UnderlineCard.tsx)**: `<article>` 태그 사용은 올바르나 `aria-label` 없음.
- **담당**: Developer

---

### 8. `BottomNav` — `aria-current` 미적용 [심각도: Medium]

- **상황**: 현재 활성 탭임을 스크린리더에 알려야 한다.
- **실제 코드(BottomNavClient.tsx)**: `active` 상태에서 색상만 변경, `aria-current="page"` 없음.
- **해결**:
```tsx
<Link aria-current={active ? "page" : undefined} ...>
```
- **담당**: Developer

---

### 9. `UnderlineCard` — 인용문 `line-clamp` 정책과 실제 값 불일치 [심각도: Low]

- **정책(designer-policy.md)**: 피드 카드 기본 `line-clamp-3`.
- **실제 코드(UnderlineCard.tsx L159)**: `line-clamp-5` (book 레이아웃), `line-clamp-5` (photo 카드).
- **판단**: 카드 유형(정사각형/3:4 세로형)에 따라 표시 가능 줄 수가 다르므로 `line-clamp-5`가 의도된 값일 수 있음. Designer가 레이아웃별 기준을 명시적으로 재정의할 것.
- **담당**: Designer (정책 업데이트)

---

### 10. `developer-policy.md` 컴포넌트 파일 구조 — 실제 파일 목록과 차이 [심각도: Low]

- **정책에 기재된 `ui/` 목록**: Alert, BookCover, ProfileChip, TagBadge (4개)
- **실제 `ui/` 파일**: Alert, BookCover, BottomNav, BottomNavClient, HeaderAction, HeroIllustration, ProfileChip, TagBadge (8개)
- **누락 항목**: `BottomNav`, `BottomNavClient`, `HeaderAction`, `HeroIllustration`
- **담당**: Developer (developer-policy.md 컴포넌트 목록 업데이트)

---

### 11. `ux-design.md` 컴포넌트 표 — 실제 파일과 차이 [심각도: Low]

- **ux-design.md에 미등재**: `BottomNav`, `BottomNavClient`, `HeaderAction`, `HeroIllustration`, `EditProfileForm`
- **담당**: Designer (ux-design.md 핵심 컴포넌트 테이블 업데이트)

---

## 개정 이력

| 날짜 | 변경 내용 | 작성자 |
|---|---|---|
| 2026-06-22 | 최초 작성 — designer-policy.md, developer-policy.md, ux-design.md, 실제 컴포넌트 파일 분석 기반 | Designer+Developer 교차 검증 에이전트 |
