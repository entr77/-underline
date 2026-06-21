"""
기존 books 테이블의 genre를 Claude API로 백필하는 스크립트.
Kakao v3/search/book 은 category_name 을 반환하지 않아
책 제목 + 저자를 Claude haiku 에 넘겨 장르를 분류한다.

사용법:
  python .claude/scripts/backfill_book_genres.py

필요한 환경변수 (.env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY
"""

import os, sys, time, json
sys.stdout.reconfigure(encoding="utf-8")

from pathlib import Path

# .env.local 로드
env_path = Path(__file__).parents[2] / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            v = v.strip().strip('"').strip("'")  # 따옴표 제거
            os.environ.setdefault(k.strip(), v)

try:
    import requests
except ImportError:
    print("pip install requests 를 먼저 실행하세요.")
    sys.exit(1)

SUPABASE_URL   = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY   = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY  = os.environ.get("ANTHROPIC_API_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY or not ANTHROPIC_KEY:
    print("환경변수가 설정되지 않았습니다. .env.local 을 확인하세요.")
    sys.exit(1)

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

GENRES = ["소설", "에세이", "인문", "자기계발", "경제/경영", "심리", "역사", "과학", "시", "기타"]

BATCH_SIZE = 20  # Claude 한 번 호출에 분류할 책 수


def classify_with_claude(books: list[dict]) -> list[str]:
    """제목+저자 목록을 Claude 에 넘겨 장르 배열 반환"""
    lines = "\n".join(
        f"{i+1}. 제목: {b['title']}, 저자: {b['author']}"
        for i, b in enumerate(books)
    )
    prompt = f"""다음 책 목록의 장르를 각각 분류해주세요.
반드시 아래 장르 중 하나만 선택하세요: {', '.join(GENRES)}

{lines}

JSON 배열만 반환하세요. 순서 유지. 예: ["소설", "에세이", "기타"]"""

    try:
        res = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        res.raise_for_status()
        text = res.json()["content"][0]["text"]
        match = __import__("re").search(r"\[.*?\]", text, __import__("re").DOTALL)
        genres = json.loads(match.group()) if match else []
        # 길이 맞추기
        while len(genres) < len(books):
            genres.append("기타")
        return [g if g in GENRES else "기타" for g in genres[:len(books)]]
    except Exception as e:
        print(f"  Claude 오류: {e}")
        return ["기타"] * len(books)


def fetch_books_without_genre() -> list[dict]:
    # NULL 이거나 아직 분류 안 된 '기타' 포함
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/books",
        headers={**SUPABASE_HEADERS, "Prefer": ""},
        params={"or": "(genre.is.null,genre.eq.기타)", "select": "id,title,author"},
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

    for i in range(0, len(books), BATCH_SIZE):
        batch = books[i:i + BATCH_SIZE]
        print(f"[{i+1}~{i+len(batch)}] Claude 분류 중...")
        genres = classify_with_claude(batch)

        for book, genre in zip(batch, genres):
            print(f"  {book['title']!r} -> {genre!r}")
            update_genre(book["id"], genre)

        if i + BATCH_SIZE < len(books):
            time.sleep(1)

    print(f"\n완료 -- {len(books)}권 업데이트됨")


if __name__ == "__main__":
    main()
