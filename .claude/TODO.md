# 밑줄 TODO

---

## ✅ 완료된 기능 (2026-06-18 기준)

- 좋아요 UI 인터랙션: LikeButton optimistic update, toggleLike 서버 액션 (2026-06-18)
- 피드 태그 필터: FeedFilter 컴포넌트, searchParams 기반 동작 (2026-06-18)
- 피드 is_liked 반영: 현재 유저 likes 쿼리 (2026-06-18)
- 밑줄 삭제: DeleteUnderlineButton (작성자 전용), deleteUnderline 서버 액션 (2026-06-18)
- 밑줄 공유 이미지 카드: ShareCardButton + GET /api/og/underline/[id] (2026-06-18)
  - 스타일 2종(라이트/다크), 포맷 3종(1:1·4:5·9:16), Noto Serif KR 폰트
  - 이미지 저장 + Web Share API 공유
- 책 단위 피드 /books: BookFeedCard, underlines → book_id 집계 (2026-06-18)
- BottomNav 4탭 확정: 홈 / 피드 / 책 / 내 프로필 (2026-06-18)
- 마케터 에이전트 추가: `.claude/agents/marketer.md` (2026-06-18)
- SNS 독서 밑줄 문화 마케팅 리서치: `.claude/docs/marketing-research.md` + Confluence ID 1245185 (2026-06-18)
- 로딩 카피 3개로 확장, 롤링 간격 2500ms 조정 (2026-06-18)
- 테스트 이미지 수집/업로드 스크립트: `.claude/scripts/` (2026-06-18)

## ✅ 완료된 기능 (2026-06-18 기준, 추가)

- 마케팅 인사이트 보고서 저장: `.claude/docs/marketing-insights-underline-behavior.md` (2026-06-18)
- 마케팅 기반 신기능 기획서 저장: `.claude/docs/feature-plan-from-marketing-insights.md` (2026-06-18)

## ⬜ 미완료 기능

### 수동 실행 필요한 SQL
- ✅ 002_storage.sql — 완료 (2026-06-18)
- ⬜ 003_books_update_policy.sql — 실행됐을 수도 있음, 확인 필요

### 팔로우 기능 (P1)
- 프로필 페이지 팔로우 버튼 UI만 있고 동작 안 함
- follows 테이블 스키마 미생성

### 마케팅 인사이트 기반 신기능 (기획 완료, 구현 대기)
기획서: `.claude/docs/feature-plan-from-marketing-insights.md`
- ⬜ **감정 태그 추천** (낮음) — /new 저장 단계에 감정 이모지 칩, FeedFilter 감정 탭 확장
- ⬜ **"같은 문장에서 멈춘 독자" 연결 강화** (낮음) — 밑줄 상세 독자 아바타 탭 → 미니 카드 슬라이드업
- ⬜ **완독 배지 & "다 읽었어요" 선언** (낮음) — user_readings 테이블 + /book/[id] 버튼
- ⬜ **에세이 장르 전용 탐색 뷰** (낮음~중간) — /books 장르 필터 탭 (카테고리 저장 선행 필요)
- ⬜ **여러 밑줄 묶음 공유 캐러셀** (중간) — 멀티 선택 + ZIP 다운로드
