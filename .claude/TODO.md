# 밑줄 TODO

## 🔴 긴급 — Vision API 502 에러
`POST /api/vision/analyze` 가 매번 502 반환 중.

**증상**: 사진 업로드 시 OCR 처리 실패, 300~966ms 안에 502
**의심 원인**:
- Google Cloud Vision API 키 쿼터 초과 or 키 제한
- Google Cloud Console에서 Vision API 활성화 여부 확인 필요
- API 키: `GOOGLE_CLOUD_VISION_API_KEY` (.env.local + Vercel 환경변수)

**확인 순서**:
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Cloud Vision API 활성화 여부
2. Credentials → API 키 제한 설정 (HTTP referrer / IP 제한 걸려있는지)
3. Quotas → 일일 한도 초과 여부
4. Vercel 대시보드 → Environment Variables → `GOOGLE_CLOUD_VISION_API_KEY` 값 확인

**임시 대응**: 에러 시 수동 입력으로 fallback 중 (기능 작동은 됨)

---

## ⬜ 미완료 기능

### 좋아요 UI 인터랙션
- DB는 준비됨 (`likes` 테이블, `like_count` 트리거)
- 피드/상세 페이지 하트 버튼 실시간 동작 미연결
- Server Action + optimistic update 구현 필요

### 수동 실행 필요한 SQL
Supabase SQL Editor에서 아직 실행 안 된 마이그레이션:
```sql
-- 002: Storage 버킷
-- (supabase/migrations/002_storage.sql 내용 실행)

-- 003: books UPDATE RLS (실행됐을 수도 있음, 확인 필요)
-- (supabase/migrations/003_books_update_policy.sql 내용 실행)
```

### 팔로우 기능
- 프로필 페이지 팔로우 버튼 UI만 있고 동작 안 함

### 주로 읽는 것들 태그 활용
- 현재 프로필에 표시만 됨
- 피드 필터와 연결하거나 제거 여부 결정 필요
