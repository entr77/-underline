"""
테스트 이미지를 실제 vision 파이프라인에 태워 피드에 업로드하는 스크립트.

flow:
  이미지 파일 → base64 인코딩
  → POST /api/vision/analyze (OCR + 책 인식 + 밑줄 감지)
  → Supabase REST API로 books upsert + underlines insert

실행:
  python3 .claude/scripts/upload_test_images.py
  python3 .claude/scripts/upload_test_images.py --limit 10   # 최대 10개만
  python3 .claude/scripts/upload_test_images.py --category highlight  # 특정 카테고리만
"""

import os
import sys
import json
import base64
import time
import argparse
import urllib.request
import urllib.error

# ── 설정 ────────────────────────────────────────────────────────────────────
DEV_SERVER   = "http://localhost:3000"
SUPABASE_URL = "https://dufzfxyimtediibdmiyk.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZnpmeHlpbXRlZGlpYmRtaXlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwNDg3MCwiZXhwIjoyMDk3MTgwODcwfQ.2S7y9YONg8D37fcYAETPEKQ6g0RUo7-shJvUCn-I1Nc"
USER_ID      = "d59b886d-620c-4113-8a15-44d9b647c410"
IMAGES_DIR   = ".tmp/test-images"
DELAY_SEC    = 2.5   # API 호출 간격 (Claude Vision rate limit 대비)

SUPABASE_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# ── 유틸 ────────────────────────────────────────────────────────────────────
def file_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def supabase_request(method: str, path: str, body=None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=SUPABASE_HEADERS, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def analyze_image(image_path: str):
    """개발 서버의 /api/vision/analyze 호출"""
    b64 = file_to_base64(image_path)
    payload = json.dumps({"imageBase64": b64}).encode()
    req = urllib.request.Request(
        f"{DEV_SERVER}/api/vision/analyze",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"    ✗ vision API 오류 {e.code}: {body[:120]}")
        return None
    except Exception as e:
        print(f"    ✗ 요청 실패: {e}")
        return None


def upsert_book(result: dict, image_path: str):
    """books 테이블에 upsert 후 book_id 반환"""
    import hashlib
    book = result.get("book") or {}
    raw_id = book.get("kakaoId") or book.get("kakao_id")
    # 책 미인식 시 파일명 기반 고유 ID
    if not raw_id:
        fname = os.path.basename(image_path)
        raw_id = "test_" + hashlib.md5(fname.encode()).hexdigest()[:10]
    title  = book.get("title") or "제목 미확인"
    author = book.get("author") or book.get("authors") or "저자 미확인"
    if isinstance(author, list):
        author = ", ".join(author)

    headers = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}
    url = f"{SUPABASE_URL}/rest/v1/books?on_conflict=kakao_id"
    body = json.dumps({
        "kakao_id":  raw_id,
        "title":     title,
        "author":    author,
        "publisher": book.get("publisher"),
        "cover_url": book.get("coverUrl") or book.get("cover_url"),
    }).encode()
    try:
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            rows = json.loads(resp.read())
        if rows and isinstance(rows, list):
            return rows[0]["id"]
        # merge-duplicates가 빈 배열 반환할 때 직접 조회
        rows2 = supabase_request("GET", f"/rest/v1/books?kakao_id=eq.{raw_id}&select=id")
        return rows2[0]["id"] if rows2 else None
    except Exception as e:
        print(f"    ✗ books upsert 오류: {e}")
        return None


def insert_underlines(book_id: str, result: dict, image_path: str):
    """underlines 테이블에 insert, 저장된 id 목록 반환"""
    highlights = result.get("highlights") or []
    # highlights가 [{text:...}] 또는 [str] 형태 모두 처리
    contents = []
    for h in highlights:
        if isinstance(h, dict):
            t = h.get("text") or h.get("content") or ""
        else:
            t = str(h)
        t = t.strip()
        if t:
            contents.append(t)

    if not contents:
        # 밑줄 감지 못했을 때 fallback: 첫 번째 텍스트 블록 사용
        raw = result.get("rawText") or result.get("text") or ""
        lines = [l.strip() for l in raw.split("\n") if len(l.strip()) > 15]
        if lines:
            contents = [lines[0]]

    if not contents:
        return []

    page_number = result.get("pageNumber") or result.get("page_number")

    rows = [
        {
            "user_id":     USER_ID,
            "book_id":     book_id,
            "content":     content,
            "page_number": page_number,
            "image_url":   None,
            "is_public":   True,
        }
        for content in contents
    ]

    try:
        inserted = supabase_request("POST", "/rest/v1/underlines", rows)
        if isinstance(inserted, list):
            return [r["id"] for r in inserted]
        return []
    except Exception as e:
        print(f"    ✗ underlines insert 오류: {e}")
        return []


# ── 메인 ────────────────────────────────────────────────────────────────────
def collect_images(category_filter=None) -> list[tuple[str, str]]:
    """(category, filepath) 목록 반환"""
    result = []
    for cat in sorted(os.listdir(IMAGES_DIR)):
        if category_filter and cat != category_filter:
            continue
        cat_dir = os.path.join(IMAGES_DIR, cat)
        if not os.path.isdir(cat_dir):
            continue
        for fname in sorted(os.listdir(cat_dir)):
            if fname.startswith("."):
                continue
            ext = fname.rsplit(".", 1)[-1].lower()
            if ext in ("jpg", "jpeg", "png", "webp"):
                result.append((cat, os.path.join(cat_dir, fname)))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="최대 처리 이미지 수")
    parser.add_argument("--category", type=str, default=None, help="특정 카테고리만")
    args = parser.parse_args()

    images = collect_images(args.category)
    if args.limit:
        images = images[: args.limit]

    print(f"총 {len(images)}개 이미지 처리 시작\n")

    stats = {"ok": 0, "no_highlight": 0, "fail": 0}

    for i, (cat, path) in enumerate(images, 1):
        fname = os.path.basename(path)
        print(f"[{i}/{len(images)}] {cat}/{fname}")

        # 1. Vision 분석
        result = analyze_image(path)
        if result is None:
            stats["fail"] += 1
            time.sleep(DELAY_SEC)
            continue

        # 결과 요약 출력
        book  = result.get("book") or {}
        highlights = result.get("highlights") or []
        print(f"    책: {book.get('title', '미인식')!r} / 밑줄: {len(highlights)}개")

        # 2. Book upsert
        book_id = upsert_book(result, path)
        if not book_id:
            stats["fail"] += 1
            time.sleep(DELAY_SEC)
            continue

        # 3. Underlines insert
        ids = insert_underlines(book_id, result, path)
        if ids:
            print(f"    ✓ {len(ids)}개 저장 → {ids}")
            stats["ok"] += len(ids)
        else:
            print(f"    △ 밑줄 텍스트 없음 (스킵)")
            stats["no_highlight"] += 1

        time.sleep(DELAY_SEC)

    print(f"\n완료")
    print(f"  저장: {stats['ok']}개")
    print(f"  밑줄 없음: {stats['no_highlight']}개")
    print(f"  실패: {stats['fail']}개")
    print(f"\n피드 확인: {DEV_SERVER}/feed")


if __name__ == "__main__":
    main()
