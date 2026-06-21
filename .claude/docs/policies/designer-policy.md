# Designer 심화 정책 — 밑줄 서비스

> 작성: Designer 에이전트 | 날짜: 2026-06-22
> 이 문서는 `ux-design.md`를 보완하는 심화 설계 정책이다.
> 새 컴포넌트나 패턴을 추가할 때 이 문서도 함께 업데이트한다.

---

## 1. 밑줄 앱 디자인 원칙

### 원칙 1 — 텍스트가 주인공이다

밑줄 서비스의 핵심 콘텐츠는 책 속 문장이다. 모든 UI 결정은 "이 선택이 텍스트를 더 잘 읽히게 하는가?"를 기준으로 판단한다. 버튼, 아이콘, 배경은 텍스트의 조연이다.

**Noto Serif KR 텍스트 가독성 기준**

| 용도 | 크기 | 행간(line-height) | 최대 너비 |
|------|------|-------------------|-----------|
| 피드 카드 인용문 | `text-base` (16px) | `leading-relaxed` (1.625) | `max-w-[340px]` (카드 내부 패딩 제외) |
| 밑줄 상세 인용문 | `text-lg` (18px) | `leading-loose` (2.0) | `max-w-[560px]` |
| 공유 카드 인용문 | 20~28px (카드 크기·문장 길이 따라 조정) | 1.6 이상 | 카드 폭의 80% 이하 |
| 긴 인용문 (4줄 초과) | `text-sm` (14px)로 한 단계 축소 | `leading-relaxed` (1.625) | 동일 |

- Noto Serif KR은 커닝이 느슨하므로 `letter-spacing: -0.01em`을 본문 세리프 클래스에 기본 적용한다.
- 줄당 최적 자수: 한국어 기준 **25~35자**. 이 범위를 초과하면 컨테이너 너비를 줄이거나 폰트 크기를 낮춘다.
- 영문 혼용 시 Noto Serif KR이 영문을 처리하므로 별도 폰트 스택 불필요. 단, 숫자(페이지 번호 등)는 `font-variant-numeric: tabular-nums` 적용.

---

### 원칙 2 — 컬러는 역할로 쓴다, 장식으로 쓰지 않는다

**크림/잉크/포레스트 사용 규칙**

| 색상 토큰 | 값 | 언제 사용하는가 | 사용하면 안 되는 곳 |
|-----------|-----|----------------|---------------------|
| `--color-cream` | #F7F3EE | 페이지·카드·모달 배경 | 텍스트, 아이콘 |
| `--color-cream-dark` | #EDE8E1 | 입력 필드 배경, 비활성 탭, 구분선 배경, hover 상태 배경 | 기본 배경 |
| `--color-ink` | #1C1917 | 주 텍스트(인용문, 제목, 본문), 주요 아이콘 | 배경 단독 사용 (dark 테마 카드는 예외) |
| `--color-ink-muted` | #6B6560 | 보조 텍스트(책 제목, 작성자 닉네임, 날짜), 아이콘 비활성 | 주 텍스트 |
| `--color-ink-faint` | #A8A29E | 입력 placeholder, 힌트 텍스트, 카운터 | 4px 이하 소형 UI 요소 |
| `--color-forest` | #1E3A2F | CTA 버튼 배경, 주요 액션 아이콘(저장·좋아요 활성), 링크, 포커스 링 | 큰 면적 배경, 텍스트 배경 |
| `--color-forest-light` | #2D5A3D | forest 버튼 hover, forest 색 링크 hover | 기본 상태 |
| `--color-border` | #E4DDD6 | 구분선, 카드 테두리, 입력 필드 테두리 | 텍스트 |
| `--color-highlight` | #FFF3B0 | 인용문 하이라이트 바, 선택된 텍스트 배경 | 전체 배경, 테두리 |

> 하드코딩 금지 — 모든 색상은 반드시 CSS 변수 또는 Tailwind `color-*` 커스텀 토큰으로만 참조한다.
> 예외: 공유 카드 내부 CSS-in-canvas 렌더링(html2canvas) 시에만 HEX 직접 사용 허용.

---

### 원칙 3 — 터치 타겟은 최소 44px

- 모든 인터랙티브 요소(버튼, 링크, 아이콘 버튼, 탭)의 실제 터치 영역은 **최소 44×44px**.
- 시각적 크기가 작더라도 `padding` 또는 `min-h-[44px] min-w-[44px]`로 터치 영역 확보.
- 아이콘 버튼 예시:

```tsx
// 올바른 예 — 아이콘은 20px이지만 터치 영역 44px 확보
<button className="flex items-center justify-center w-11 h-11 -m-1.5">
  <HeartIcon className="w-5 h-5" />
</button>

// 금지 — 터치 영역 미확보
<button className="w-5 h-5">
  <HeartIcon />
</button>
```

- BottomNav 탭: 높이 `h-14`(56px), 탭 너비는 화면을 4등분.
- 입력 필드: 높이 최소 `h-11`(44px), 권장 `h-12`(48px).

---

### 원칙 4 — 빈 상태와 로딩 상태는 필수 설계 항목이다

**모든 리스트·피드 컴포넌트는 다음 3가지 상태를 반드시 설계한다:**

| 상태 | 설계 기준 |
|------|-----------|
| **로딩(loading)** | 실제 카드 레이아웃과 동일한 Skeleton UI. `animate-pulse` 적용. 높이는 실제 카드 평균 높이와 동일하게 설정해 레이아웃 이동(CLS) 방지. |
| **빈 상태(empty)** | 일러스트 또는 아이콘 + 한국어 안내 문구 + (적절한 경우) CTA 버튼. "데이터 없음" 텍스트만 단독 사용 금지. |
| **에러(error)** | `<Alert variant="error">` 사용 필수. 재시도 버튼 제공. |

**빈 상태 문구 톤앤매너:**
- 기계적 안내 금지: "결과가 없습니다" (X)
- 공감 + 행동 유도: "아직 밑줄이 없어요. 첫 문장을 기록해볼까요?" (O)

---

### 원칙 5 — 모바일 퍼스트, 확장은 단계적으로

- 설계 시작점은 항상 **375px** (iPhone SE/13 mini 기준).
- 768px 태블릿: 카드 그리드를 2열로 전환하거나 사이드 여백 확장.
- 1280px 데스크탑: `max-w-[430px]` 컨테이너를 유지하거나 2~3열 그리드로 전환. 피드는 중앙 단일 컬럼 유지 권장(읽기 집중).
- 데스크탑 전용 기능은 설계하지 않는다. 모바일에서 안 되는 기능은 데스크탑에서도 안 된다.

---

### 원칙 6 — 아날로그 감성을 디지털로 번역한다

밑줄 서비스의 UX 무드는 "종이책 + 소셜 피드"의 교차점이다.

- 트랜지션·애니메이션은 빠르고 절제된 느낌 유지. 지속 시간 기본 `150~200ms`, ease-out.
- 그림자는 최소화. 카드 구분은 그림자 대신 `border` + 배경 색 대비로.
- 라운드: 카드 `rounded-xl`(12px), 버튼 `rounded-lg`(8px), 뱃지 `rounded-full`. 날카로운 모서리(0)는 사용하지 않는다.
- 인용 부호(`«`, `»`, `"`, `"`) 사용 시 Noto Serif KR에 포함된 유니코드 문자 직접 사용.

---

### 원칙 7 — 실제 콘텐츠로 설계한다

- Lorem ipsum, "제목", "내용" 같은 자리채우기 텍스트 사용 금지.
- 컴포넌트 스펙 문서와 목업에는 실제 한국 소설/에세이의 문장 예시를 사용한다.

예시 사용 텍스트:
- 인용문: `"나는 나를 파괴할 권리가 있다."`
- 책 제목: `채식주의자`
- 저자: `한강`
- 닉네임: `bookworm_`

---

## 2. UnderlineCard 설계 기준

### 정보 계층

피드 카드에서 정보는 아래 순서로 시선을 유도한다:

```
1순위: 밑줄 문장 (인용문) — font-serif, text-base, color-ink
2순위: 책 제목 + 저자 — font-sans, text-sm, color-ink-muted
3순위: 작성자 ProfileChip — 아바타 24px + 닉네임 text-xs
4순위: 좋아요 수 + 공유 액션 — 카드 하단 우측 정렬
```

- 책 표지 이미지가 있을 때는 좌측 48×64px(3:4 비율)로 배치. 문장 컨테이너 오른쪽에 float하지 않고 상단 정렬.
- 작성자 정보와 날짜는 항상 카드 최상단(문장 위) 또는 최하단(문장 아래) 중 하나로 고정. 혼용 금지.
- 현재 구현: 작성자 상단, 좋아요/날짜 하단.

---

### 이미지 있을 때 / 없을 때 레이아웃 전환

**이미지 있는 경우 (`imageUrl` 존재)**
```
┌─────────────────────────────────┐
│ [avatar] 닉네임        날짜     │
│                                 │
│ "인용 문장 텍스트가 여기에      │
│  표시됩니다. 최대 3줄까지."     │
│                                 │
│ [표지 48×64] 채식주의자         │
│              한강               │
│                                 │
│              ♥ 12   공유 아이콘 │
└─────────────────────────────────┘
```

**이미지 없는 경우**
```
┌─────────────────────────────────┐
│ [avatar] 닉네임        날짜     │
│                                 │
│ "인용 문장 텍스트가 여기에      │
│  표시됩니다."                   │
│                                 │
│ 채식주의자 · 한강               │  ← 텍스트만, 표지 없음
│                                 │
│              ♥ 12   공유 아이콘 │
└─────────────────────────────────┘
```

- 이미지 fallback: `<BookCover>` 컴포넌트가 처리. 직접 `<img>` 에러 핸들링 금지.
- 이미지 로딩 중: `bg-cream-dark animate-pulse` skeleton.

---

### 긴 인용 텍스트 truncate 기준

| 상황 | 기준 |
|------|------|
| 피드 카드 기본 | 최대 **3줄** (`line-clamp-3`). 초과 시 `"..."` 처리 + "더 보기" 링크. |
| UnderlineGroupCard (묶음) | 각 밑줄 최대 **2줄** (`line-clamp-2`). |
| 밑줄 상세 페이지 (`/underline/[id]`) | 전체 표시. truncate 없음. |
| 공유 카드 내부 | 문장 길이에 따라 폰트 크기 동적 조정 (최대 120자 초과 시 18px → 16px). 120자 초과 → 120자 + `"…"` 잘라내기. |

- 글자 수 기준이 아닌 **줄 수 기준**(`line-clamp-*`)을 우선 사용한다 — 반응형에서 더 안정적.
- 한국어는 단어 단위 줄바꿈이 아닌 음절 단위이므로 `word-break: keep-all`을 인용문 컨테이너에 적용한다.

```tsx
// 피드 카드 인용문 기본 클래스
"font-serif text-base leading-relaxed text-[color:var(--color-ink)] line-clamp-3 [word-break:keep-all]"
```

---

### 탭/호버 인터랙션 표준

| 이벤트 | 동작 | 구현 |
|--------|------|------|
| 카드 hover (데스크탑) | 배경 `cream-dark` 로 transition | `hover:bg-[color:var(--color-cream-dark)] transition-colors duration-150` |
| 카드 tap (모바일) | 즉각적 피드백 없음 — 상세 페이지로 이동 | `active:` 클래스 선택적 적용 |
| 좋아요 버튼 tap | 즉각 숫자 업데이트 (optimistic) + 아이콘 컬러 토글 | LikeButton 내부 처리 |
| 공유 버튼 tap | 공유 모달/시트 열림 | 별도 이벤트 전파 차단 필요(`e.stopPropagation()`) |
| 카드 전체 클릭 → 상세 | `<Link href="/underline/[id]">` 래핑 | 버튼 클릭은 `e.preventDefault()` 불필요, stopPropagation만 |

---

## 3. 컴포넌트 설계 체크리스트

### 신규 컴포넌트 추가 시 반드시 포함할 항목

```markdown
## 컴포넌트명

**용도**: (한 줄 설명)
**위치**: src/components/ui/ 또는 src/components/features/

### Props
| prop | type | default | 필수 | 설명 |
|------|------|---------|------|------|

### 상태 (State)
- [ ] idle (기본)
- [ ] loading (데이터 로딩 중)
- [ ] empty (데이터 없음)
- [ ] error (오류 발생)
- [ ] disabled (비활성)

### Variants
- default / compact / featured 등 — 실제로 필요한 것만 정의

### 반응형
- 모바일(375px): ...
- 태블릿(768px): ...
- 데스크탑(1280px): ...

### 접근성
- aria-label / aria-describedby 패턴
- 키보드 동작 (Tab, Enter, Space, Escape)
- 스크린리더 읽기 순서

### 의존 컴포넌트
- 사용하는 하위 컴포넌트 목록

### 사용 예시 (실제 콘텐츠로)
```tsx
<ComponentName prop="실제 값" />
```
```

---

### 한국어 텍스트 특화 고려사항

**줄바꿈**
- 본문 인용문: `word-break: keep-all` 필수 — 한국어 단어(조사 포함)가 줄 끝에서 분리되지 않도록.
- 버튼·레이블: `whitespace-nowrap` 적용 — 버튼 텍스트가 2줄로 분리되는 사고 방지.
- 긴 제목(책 제목 등): `overflow-hidden text-ellipsis` + 최대 폭 제한.

**폰트 fallback**
```css
/* 세리프: 반드시 이 순서 유지 */
font-family: 'Noto Serif KR', 'Georgia', serif;

/* 산세리프: 반드시 이 순서 유지 */
font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
```
- `next/font`로 로드할 때 `subsets: ['latin']`만 지정하면 한글 글리프 누락 → `subsets: ['latin', 'korean']` 또는 Google Fonts 직접 임포트.

**폰트 크기 최솟값**
- 한국어는 영문보다 획이 복잡해 12px 이하에서 가독성이 급격히 저하된다.
- UI 내 최소 텍스트 크기: `text-xs`(12px). 그 이하는 절대 금지.

---

### Alert 컴포넌트 사용 강제 케이스

아래 케이스에서는 `<Alert>` 없이 인라인 div/span으로 메시지를 표시하는 것을 금지한다:

| 케이스 | 사용 variant |
|--------|-------------|
| 폼 제출 실패 (서버 에러, 네트워크 에러) | `error` |
| 입력 유효성 검사 실패 (필드 단위 아님) | `error` |
| 삭제·취소 등 되돌릴 수 없는 작업 전 경고 | `warning` |
| 이메일 인증 필요 안내 | `info` |
| 저장·전송·삭제 성공 피드백 | `success` |
| OCR 처리 실패 또는 책 인식 실패 안내 | `warning` |
| 빈 상태에서의 안내 문구 (피드, 마이페이지) | `info` |

---

## 4. 접근성 기준 (밑줄 서비스 특화)

### 크림 배경 위 텍스트 최소 명도 대비 비율

배경 `#F7F3EE` (--color-cream) 기준:

| 텍스트 용도 | 색상 | 대비 비율 | WCAG 기준 |
|-------------|------|-----------|-----------|
| 주 텍스트 (인용문, 제목) | #1C1917 | **~16.5:1** | AAA (7:1 이상) 통과 |
| 보조 텍스트 (책 제목, 닉네임) | #6B6560 | **~5.8:1** | AA (4.5:1 이상) 통과 |
| 힌트/placeholder | #A8A29E | **~2.8:1** | AA 미달 — placeholder는 예외 허용, 단 입력 후 텍스트는 반드시 AA 통과 색상 사용 |
| 포레스트 버튼 위 흰 텍스트 | #FFFFFF on #1E3A2F | **~12.1:1** | AAA 통과 |

> 새 색상 조합 추가 시 [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)로 대비 비율 확인 필수.

---

### 포커스 링 스타일 기준

- 기본 브라우저 `outline` 제거 후 반드시 커스텀 포커스 링 제공.
- 표준 패턴: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-forest)]`
- 어두운 배경 위(다크 카드, forest 버튼 등): 포커스 링을 `#FFF3B0` (--color-highlight) 또는 흰색으로 전환.
- 마우스 클릭 시에는 포커스 링이 보이지 않아야 한다 → `focus-visible:` (`:focus` 아님) 사용 필수.

```tsx
// 표준 포커스 패턴 예시
<button className="... focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-forest)]">
```

---

### 밑줄 카드 ARIA 레이블 패턴

```tsx
// UnderlineCard — aria-label 패턴
<article
  aria-label={`${author}님의 밑줄 — ${bookTitle}: "${quote.slice(0, 30)}…"`}
>
  {/* 카드 내용 */}
</article>

// 좋아요 버튼
<button
  aria-label={isLiked ? `좋아요 취소 (현재 ${count}개)` : `좋아요 (현재 ${count}개)`}
  aria-pressed={isLiked}
>

// 공유 버튼
<button aria-label="이 밑줄 공유하기">

// 삭제 버튼 (작성자 전용)
<button aria-label="밑줄 삭제">
```

- `<article>` 태그로 카드를 마크업 → 스크린리더가 독립 콘텐츠 단위로 인식.
- 카드 내 이미지(책 표지): `alt="채식주의자 책 표지"` 패턴. 장식적 이미지는 `alt=""`.
- `role="feed"` 또는 `role="list"` + `role="listitem"` 조합으로 피드 시맨틱 구조화.

---

## 5. 디자인-개발 인계 체크리스트

### Designer가 Developer에게 넘기기 전 확인 항목

```
컴포넌트 스펙
[ ] Props 타입 정의 완료 (TypeScript 기준)
[ ] 모든 상태(idle/loading/empty/error/disabled) 설계 완료
[ ] 실제 콘텐츠(한국어 제목, 문장)로 검증
[ ] 최장 문자열 케이스 설계 (책 제목 30자, 인용문 200자 등)
[ ] 최단 문자열 케이스 설계 (닉네임 2자, 인용문 10자 등)

반응형
[ ] 375px 모바일 레이아웃 명세 완료
[ ] 768px 태블릿 변화 지점 명시 (없으면 "모바일과 동일" 명시)
[ ] 1280px 데스크탑 변화 지점 명시 (없으면 "모바일과 동일" 명시)

디자인 토큰
[ ] 모든 색상이 CSS 변수 참조 (HEX 하드코딩 없음)
[ ] 모든 폰트가 --font-serif / --font-sans 참조
[ ] 스페이싱이 Tailwind 표준 scale 사용 (임의 px값 최소화)

접근성
[ ] 모든 이미지에 alt 텍스트 명시
[ ] 버튼·링크에 aria-label 패턴 명시
[ ] 포커스 링 스타일 명시
[ ] 색상 대비 비율 확인 완료

상호작용
[ ] 인터랙티브 요소 터치 타겟 44px 이상 확인
[ ] 호버/탭/포커스/활성/비활성 상태별 스타일 명시
[ ] 트랜지션 지속 시간 명시 (기본 150ms)

Alert 사용 여부
[ ] 오류/성공/경고 메시지가 필요한 케이스 → Alert 컴포넌트 지정 완료
```

---

### 하드코딩 금지 항목

| 항목 | 금지 | 대신 |
|------|------|------|
| 색상 | `#1C1917`, `color: black` | `var(--color-ink)`, `text-[color:var(--color-ink)]` |
| 폰트 패밀리 | `font-family: 'Noto Serif KR'` 인라인 | `font-serif` 클래스, `var(--font-serif)` |
| 스페이싱 | `margin: 13px`, `padding: 7px` | Tailwind scale (`m-3`, `p-2`) 또는 `4px` 배수 |
| 그림자 | `box-shadow: 0 2px 4px #00000020` 인라인 | Tailwind `shadow-sm`, `shadow-md` |
| 중단점(breakpoint) | `@media (max-width: 430px)` 임의값 | `sm:`, `md:`, `lg:` Tailwind 프리픽스 또는 `max-w-[430px]` 컨테이너 패턴 |
| z-index | `z-index: 999` | Tailwind `z-10`, `z-20`, `z-50` 중 목적에 맞는 값 |

---

### 반응형 분기점별 레이아웃 명세 필수 여부

| 컴포넌트 유형 | 모바일 명세 | 태블릿 명세 | 데스크탑 명세 |
|---------------|-------------|-------------|----------------|
| 피드 카드 | 필수 | 변화 없으면 "모바일과 동일" 명시 | 필수 (2열 그리드 여부 결정) |
| 네비게이션 | 필수 | 필수 | 필수 (사이드바 전환 여부) |
| 모달/바텀시트 | 필수 | 변화 없으면 "모바일과 동일" 명시 | 필수 (중앙 정렬 다이얼로그 전환 여부) |
| 폼(입력 페이지) | 필수 | 변화 없으면 "모바일과 동일" 명시 | 필수 (최대 폭 제한 명시) |
| 공유 카드(canvas) | 필수 | 동일 | 동일 |

---

## 6. 카드 테마 시스템 설계 원칙

### 새 테마 추가 기준

다음 조건을 **모두** 충족해야 새 테마를 추가한다:

1. **독립된 SNS 공유 맥락이 있어야 한다** — 기존 테마로 커버되지 않는 새로운 공유 상황(플랫폼, 감정, 독자 유형)이 존재해야 함.
2. **시각적으로 기존 테마와 충분히 달라야 한다** — 배경색만 살짝 바꾼 변형은 새 테마가 아니다. `ux-design.md`의 테마 목록과 비교해 차별성 서술 필수.
3. **ThemePreset 타입의 모든 필드를 완성해야 한다** — `id`, `label`, `desc`, `cardBg`, `cardFont`, `cardAlign`, `cardVAlign`, `displayMode`, `showAuthor` 전부.
4. **미니 카드 bgStyle을 반드시 정의해야 한다** — 테마 선택 모달의 미니 카드 렌더링에 사용할 배경 스타일과 fallback을 명시.
5. **사용 시나리오 2개 이상을 구체적으로 작성해야 한다** — "인스타 화이트 피드 공유 시 선택하는 독자" 수준의 구체성.

---

### 새 테마 추가 프로세스

```
1. ux-design.md의 테마 목록과 비교 → 차별성 확인
2. ThemePreset 타입 필드 전체 작성
3. 미니 카드 bgStyle 및 fallback 정의
4. ShareCardButton 또는 카드 렌더러에 케이스 추가
5. 테마 선택 모달에 미니 카드 항목 추가
6. ux-design.md 테마 목록 테이블 업데이트
7. 이 문서(designer-policy.md) "테마 미니 카드 bgStyle 설계 패턴" 섹션 업데이트
8. Confluence UI/UX 설계 페이지(ID: 360619) 업데이트
9. 커밋 & 푸시
```

> 코드만 추가하고 문서를 업데이트하지 않으면 다음 에이전트가 중복 테마를 추가할 수 있다.

---

### 테마 미니 카드 bgStyle 설계 패턴

미니 카드는 테마 선택 모달에서 사용자가 테마를 고를 때 보이는 **60×80px 이하의 썸네일**이다. 실제 카드와 동일한 렌더링 엔진을 쓰지 않으므로 CSS inline style로 배경을 표현한다.

**설계 원칙:**

1. **테마의 배경 무드를 즉각 전달해야 한다** — 3초 안에 어떤 느낌인지 알 수 있어야 함.
2. **실제 데이터 의존은 최소화한다** — 책 표지나 Unsplash 이미지가 로드되지 않을 때를 대비한 fallback이 항상 있어야 함.
3. **밝은 테마(paper)는 텍스트 라인을 어두운 색으로 넣어 "카드"임을 인지시킨다** — 흰 배경만 있으면 빈 영역처럼 보일 수 있음.

**bgStyle 결정 로직 패턴:**

```ts
function getThemeMiniCardBgStyle(
  theme: ThemeId,
  opts: { coverUrl?: string; uploadedPhotoUrl?: string; sceneUrl?: string }
): React.CSSProperties {
  switch (theme) {
    case 'book':
      return opts.coverUrl
        ? { backgroundImage: `url(${opts.coverUrl})`, backgroundSize: 'cover', filter: 'brightness(0.58) saturate(0.3)' }
        : { backgroundColor: '#1a1a1a' };
    case 'dark':
      return { backgroundColor: '#1C1917' };
    case 'gradient':
      return { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' };
    case 'photo':
      return opts.uploadedPhotoUrl
        ? { backgroundImage: `url(${opts.uploadedPhotoUrl})`, backgroundSize: 'cover' }
        : { backgroundColor: '#2a2a2a' };
    case 'scene':
      return opts.sceneUrl
        ? { backgroundImage: `url(${opts.sceneUrl})`, backgroundSize: 'cover' }
        : { background: 'linear-gradient(135deg, #1a2a3a 0%, #2d4a3a 100%)' };
    case 'paper':
      return { backgroundColor: '#F7F3EE' };
      // paper 미니 카드에는 텍스트 라인(div) 3~4개를 어두운 색으로 overlay해 카드임을 인지시킴
    default:
      return { backgroundColor: '#1a1a1a' };
  }
}
```

**paper 테마 미니 카드 특이사항:**
- 배경이 밝아 텍스트 라인 시뮬레이션 필수.
- `--color-ink-muted`(#6B6560) 색상의 가로 바(height: 2px) 3~4개를 세로로 배치해 텍스트가 있는 것처럼 시각화.
- 좌측에 `--color-forest`(#1E3A2F) 세로선(3px) 추가.

---

## 개정 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2026-06-22 | 최초 작성 | Designer 에이전트 |
