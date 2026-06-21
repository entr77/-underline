"""
기존 books 테이블의 genre를 Kakao API로 백필하는 스크립트.

사용법:
  python3 .claude/scripts/backfill_book_genres.py

필요한 환경변수 (.env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  KAKAO_REST_API_KEY
"""

import os, sys, time, re, json
from pathlib import Path

# .env.local 로드
env_path = Path(__file__).parents[2] / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

try:
    import requests
except ImportError:
    print("requests 라이브러리가 필요합니다: pip install requests")
    sys.exit(1)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
KAKAO_KEY    = os.environ.get("KAKAO_REST_API_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY or not KAKAO_KEY:
    print("환경변수가 설정되지 않았습니다. .env.local을 확인하세요.")
    sys.exit(1)

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def kakao_to_genre(category: str) -> str:
    c = category or ""
    if "에세이" in c: return "에세이"
    if "소설" in c:   return "소설"
    if "시/희곡" in c or "시집" in c: return "시"
    if "자기계발" in c: return "자기계발"
    if "경제" in c or "경영" in c: return "경제/경영"
    if "심리" in c:   return "심리"
    if "철학" in c or "인문" in c: return "인문"
    if "역사" in c:   return "역사"
    if "과학" in c:   return "과학"
    return "기타"

def search_kakao(query: str) -> str | None:
    """isbn 또는 제목으로 카카오 검색 후 category_name 반환"""
    try:
        r = requests.get(
            "https://dapi.kakao.com/v3/search/book",
            headers={"Authorization": f"KakaoAK {KAKAO_KEY}"},
            params={"query": query, "size": 1},
            timeout=5,
        )
        r.raise_for_status()
        docs = r.json().get("documents", [])
        if docs:
            return docs[0].get("category_name", "")
    except Exception as e:
        print(f"  Kakao 오류: {e}")
    return None

def fetch_books_without_genre() -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/books",
        headers=SUPABASE_HEADERS,
        params={"genre": "is.null", "select": "id,kakao_id,title,author,isbn"},
    )
    r.raise_for_status()
    return r.json()

def update_genre(book_id: str, genre: str):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/books",
        headers=SUPABASE_HEADERS,
        params={"id": f"eq.{book_id}"},
        json={"genre": genre},
    )
    r.raise_for_status()

def main():
    books = fetch_books_without_genre()
    print(f"genre 없는 책 {len(books)}권 발견\n")

    updated = 0
    skipped = 0

    for book in books:
        title  = book.get("title", "")
        isbn   = book.get("isbn") or book.get("kakao_id", "")
        bid    = book["id"]

        # ISBN이 숫자면 우선 시도, 아니면 제목으로
        query = isbn if re.match(r"^\d{10,13}$", isbn) else title
        print(f"검색: {title!r} ({query})", end=" → ")

        category = search_kakao(query)
        if category is None and query != title:
            # isbn 실패 시 title fallback
            category = search_kakao(title)

        if category is not None:
            genre = kakao_to_genre(category)
            update_genre(bid, genre)
            print(f"{genre!r}  (카카오: {category!r})")
            updated += 1
        else:
            update_genre(bid, "기타")
            print("'기타' (카카오 결과 없음)")
            skipped += 1

        time.sleep(0.12)  # Kakao rate limit 방지

    print(f"\n완료 — 업데이트: {updated}권, 기타 처리: {skipped}권")

if __name__ == "__main__":
    main()
