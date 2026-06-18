# 개발 루틴

모든 에이전트는 아래 루틴을 작업 유형에 맞게 따른다.

---

## 1. 공통 컴포넌트 추가 루틴

새 공통 UI 컴포넌트(Alert, Modal, Toast 등)를 만들 때:

```
1. grep — 기존 코드베이스에서 관련 인라인 패턴 찾기
2. 설계 — variants·props 정의 (ux-design.md의 디자인 토큰 사용)
3. 구현 — src/components/ui/ 에 파일 생성
4. 교체 — grep에서 찾은 기존 인라인 코드를 전부 새 컴포넌트로 교체
5. 문서화 — ux-design.md 컴포넌트 표에 추가 + 사용 규칙 명세
6. 커밋 & 푸시
```

> 교체 없이 컴포넌트만 만들지 않는다. 기존 코드와 공존하면 규칙이 무의미해진다.

---

## 2. 기능 개발 루틴

새 페이지나 기능을 구현할 때:

```
1. 문서 확인 — prd.md / ux-design.md 에서 요구사항·디자인 확인
2. 목업 우선 — 실데이터 없이 UI 먼저 구성, mock 데이터로 렌더링 확인
3. 데이터 연결 — Supabase 쿼리 연결, mock 폴백 제거 또는 조건부 유지
4. 에러 처리 — 반드시 <Alert variant="error"> 사용 (인라인 div 금지)
5. 커밋 & 푸시
```

---

## 3. 버그 수정 루틴

버그를 고칠 때:

```
1. 근본 원인 파악 — 현상이 아니라 원인을 찾는다
2. 범위 확인 — 같은 패턴이 다른 파일에도 있는지 grep
3. 전체 수정 — 보고된 것뿐 아니라 같은 원인의 모든 곳을 수정
4. 커밋 & 푸시
```

---

## 4. DB 스키마 변경 루틴

마이그레이션 파일을 추가할 때:

```
1. supabase/migrations/ 에 순번 파일 생성 (예: 004_xxx.sql)
2. 사용자에게 Supabase SQL Editor에서 실행 요청
3. RLS 정책도 함께 작성 (누락 시 PGRST/42501 에러 발생)
4. 커밋 & 푸시
```

> 마이그레이션은 코드로 기록하되, 실행은 Supabase 대시보드에서 수동으로 해야 한다.

---

## 5. 작업 마무리 루틴

모든 작업의 마지막:

```
1. git add — 관련 파일만 명시적으로 스테이징 (.env.local 절대 포함 금지)
2. git commit — 변경 이유 중심의 메시지 (한국어 가능)
3. git push origin main
4. 수동 작업 필요 사항 안내 — SQL 실행, Vercel 환경변수 등
```

---

## 6. 새 규칙·패턴 도입 루틴

코드에서 새로운 표준이 생길 때:

```
1. 구현 — 컴포넌트·패턴·정책 코드 작성
2. 기존 코드 교체 — 구 패턴 전부 새 패턴으로 교체
3. 문서 반영 — ux-design.md(UI 관련) 또는 이 파일(개발 정책)에 즉시 추가
4. CLAUDE.md 확인 — 새 문서라면 @임포트 추가
5. 커밋 & 푸시
```

> 문서에 없는 규칙은 다음 에이전트가 모른다. 규칙을 만들었으면 반드시 문서화한다.

---

## 7. Vision 분석 기능 확장 루틴

OCR / 밑줄 감지 / 책 식별 / 페이지 번호 기능을 수정하거나 새 전략을 추가할 때:

```
1. 대상 파악 — 어느 Analyzer를 수정할지 결정
   - 밑줄 감지 → src/lib/vision/analyzers/highlight-analyzer.ts
   - 페이지 번호 → src/lib/vision/analyzers/page-number-analyzer.ts
   - 책 식별 → src/lib/vision/analyzers/book-analyzer.ts
   - 전체 파이프라인 → src/lib/vision/orchestrator.ts

2. 타입 변경 시 — src/lib/vision/types.ts 먼저 수정
3. 해당 Analyzer 수정 (다른 Analyzer·라우트·UI 무관)
4. tsc --noEmit 으로 타입 체크
5. Confluence 기술 스택 & 아키텍처 페이지 업데이트 (ID: 622593)
6. 커밋 & 푸시
```

**독립 API 엔드포인트 (기능별 단독 호출 가능):**
| 엔드포인트 | 역할 |
|---|---|
| POST /api/vision/analyze | 전체 파이프라인 (OCR + 밑줄 + 페이지 + 책) |
| POST /api/vision/highlight | 밑줄 감지만 |
| POST /api/vision/book | 책 식별만 |
| POST /api/vision/page | 페이지 번호만 |

---

## 8. 테스트 이미지 업로드 루틴

실제 파이프라인(vision analyze → Supabase insert)을 테스트할 때:

```
1. 이미지 준비 — .tmp/test-images/ 에 실제 책 페이지 사진 저장
   (Bing 크롤러 이미지는 stock 사진이 많아 OCR 품질 낮음 — 직접 찍은 사진 권장)
2. 개발 서버 실행 — npm run dev (localhost:3000)
3. 업로드 스크립트 실행:
   python3 .claude/scripts/upload_test_images.py
   python3 .claude/scripts/upload_test_images.py --limit 5         # 5개만
   python3 .claude/scripts/upload_test_images.py --category korean  # 특정 카테고리
4. 피드 확인 — http://localhost:3000/feed
5. 잘못 들어간 데이터 삭제 — Supabase 대시보드 또는 스크립트로 직접 DELETE
```

> 이미지 수집: `python3 .claude/scripts/collect_test_images.py` (Bing 기반)
> 수집된 이미지 적합성을 직접 확인 후 불필요한 것 삭제하고 업로드할 것

---

## 금지 사항 요약

| 금지 | 대신 |
|------|------|
| 인라인 에러 div | `<Alert variant="error">` |
| 하드코딩 색상값 | `var(--color-*)` 토큰 |
| mock 데이터 영구 사용 | Supabase 실데이터 연결 |
| 컴포넌트만 추가하고 기존 코드 방치 | 기존 인라인 전부 교체 |
| .env.local 커밋 | .gitignore 확인 후 제외 |
| service role key 클라이언트 노출 | 서버에서만 사용 |
