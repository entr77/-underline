#!/usr/bin/env python3
"""
책별 명문장 생성 후 Supabase 밑줄 삽입 스크립트
Anthropic API로 각 책의 실제 명문장/핵심 구절을 생성하고 seed 유저의 밑줄로 저장한다.
"""

import json
import os
import random
import urllib.request
import urllib.error
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# Load env
env = {}
with open(os.path.join(os.path.dirname(__file__), '../../.env.local')) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = env['ANTHROPIC_API_KEY']

# Genre → username patterns (seed users)
GENRE_PATTERNS = {
    "소설": ["novella", "literary", "books", "classics", "scifi", "dystopia", "future", "specfic", "reads"],
    "한국소설": ["novella", "literary", "books", "reads"],
    "외국소설": ["scifi", "classics", "specfic", "dystopia", "reads"],
    "에세이": ["reads", "literary", "books", "novella", "mindset"],
    "시": ["literary", "classics", "reads"],
    "인문": ["stoic", "philo", "socrates", "ethica", "logos"],
    "경제경영": ["stocks", "vc", "investor", "wealth", "macro", "realfin", "fire"],
    "경제/경영": ["stocks", "vc", "investor", "wealth", "macro", "realfin", "fire"],
    "자기계발": ["habit", "mindset", "productivity", "growth", "wellbeing", "soeun"],
    "과학": ["quantum", "bio", "space", "cosmos", "climate", "rl", "neural", "cv", "ml", "llm"],
    "기술/컴퓨터": ["llm", "neural", "cv", "ml", "rl", "aimarketer", "aipm", "aiventure", "minseok"],
    "역사/문화": ["annals", "historica", "kronos", "epoch", "herstory", "journal"],
    "역사": ["annals", "historica", "kronos", "epoch", "herstory"],
    "정치사회": ["civic", "socio", "policy", "digital", "aimarketer"],
    "심리": ["mindset", "philo", "stoic", "wellbeing", "growth", "habit"],
    "청소년": ["literary", "books", "novella", "scifi", "reads"],
    "예술": ["literary", "classics", "novella", "reads"],
    "건강": ["wellbeing", "growth", "habit", "mindset", "bio"],
}

CARD_BGS = ["cover", "color", "color", "color"]
CARD_BG_URLS = {
    "color": ["#1C1917", "#F7F3EE", "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)"]
}
CARD_ALIGNS = ["left", "left", "center"]
CARD_VALIGNS = ["bottom", "center"]


def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Range': '0-999'
    })
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def supabase_post(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    })
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return e.code


def call_claude(messages, max_tokens=2000):
    url = "https://api.anthropic.com/v1/messages"
    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": max_tokens,
        "messages": messages
    }).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
    })
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=60)
            data = json.loads(resp.read())
            return data['content'][0]['text']
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def generate_quotes(book_title, author, genre):
    prompt = f"""당신은 독서 전문가입니다. 아래 책의 명문장/핵심 구절 5개를 추출하거나 창작하세요.

책 제목: {book_title}
저자: {author}
장르: {genre}

규칙:
- 각 문장은 한국어로, 20자~180자
- 책의 실제 내용/주제/감성을 담은 문장
- 독자가 밑줄 그을 만한 인상적인 문장
- 번호, 따옴표, 설명 없이 문장만 출력
- 한 줄에 하나씩, 정확히 5개

출력 형식:
[문장1]
[문장2]
[문장3]
[문장4]
[문장5]"""

    text = call_claude([{"role": "user", "content": prompt}])
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    # Filter out non-quote lines (numbers, explanations, etc.)
    quotes = []
    for line in lines:
        # Remove leading numbers or dashes
        cleaned = line.lstrip('0123456789.-) ').strip()
        # Remove surrounding quotes
        cleaned = cleaned.strip('"\'""''')
        if len(cleaned) >= 15 and not cleaned.startswith('(') and '책의' not in cleaned:
            quotes.append(cleaned)
        if len(quotes) == 5:
            break

    # Fallback if not enough
    while len(quotes) < 5:
        quotes.append(f"{book_title}에서 밑줄 친 문장 - {author}의 생각이 담긴 구절")

    return quotes[:5]


def get_users_for_genre(genre, all_users):
    patterns = GENRE_PATTERNS.get(genre, [])
    matched = []
    for u in all_users:
        name = u['username']
        for pat in patterns:
            if pat in name:
                matched.append(u)
                break
    if len(matched) < 2:
        # fallback: add random users
        extras = [u for u in all_users if u not in matched]
        random.shuffle(extras)
        matched = matched + extras
    return matched[:2]


def random_card_fields():
    card_bg = random.choice(CARD_BGS)
    card_bg_url = None
    if card_bg == "color":
        card_bg_url = random.choice(CARD_BG_URLS["color"])
    return {
        "card_bg": card_bg,
        "card_bg_url": card_bg_url,
        "card_font": "serif",
        "card_align": random.choice(CARD_ALIGNS),
        "card_valign": random.choice(CARD_VALIGNS),
    }


def process_book(book, all_users):
    book_id = book['id']
    title = book['title']
    author = book['author']
    genre = book.get('genre', '소설')

    try:
        quotes = generate_quotes(title, author, genre)
        users = get_users_for_genre(genre, all_users)

        rows = []
        for user in users:
            pages_used = set()
            for quote in quotes:
                page = random.randint(10, 400)
                while page in pages_used:
                    page = random.randint(10, 400)
                pages_used.add(page)

                row = {
                    "user_id": user['id'],
                    "book_id": book_id,
                    "content": quote,
                    "page_number": page,
                    "is_public": True,
                    **random_card_fields()
                }
                rows.append(row)

        # Insert in batches of 10
        for i in range(0, len(rows), 10):
            batch = rows[i:i+10]
            status = supabase_post("underlines", batch)
            if status not in (200, 201):
                print(f"  WARN: insert returned {status} for {title}")
            time.sleep(0.1)

        print(f"  OK [{genre}] {title[:30]} → {len(rows)} underlines ({len(users)} users × {len(quotes)} quotes)")
        return len(rows)
    except Exception as e:
        print(f"  FAIL {title[:30]}: {e}")
        return 0


def main():
    print("Loading data...")
    batches = json.load(open('/Users/entr/Documents/GitHub/underline/.tmp/search_batches.json'))
    all_books = [book for batch in batches for book in batch]
    print(f"Total books to process: {len(all_books)}")

    # Get all seed users
    all_users = supabase_get("users", "select=id,username")
    seed_users = [u for u in all_users if u['username'] != 'entr']
    print(f"Seed users: {len(seed_users)}")

    total_inserted = 0
    failed = []

    # Process books with limited concurrency (3 at a time to avoid rate limits)
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_book, book, seed_users): book for book in all_books}
        for i, future in enumerate(as_completed(futures)):
            book = futures[future]
            try:
                count = future.result()
                total_inserted += count
            except Exception as e:
                print(f"  EXCEPTION for {book['title']}: {e}")
                failed.append(book['title'])

            if (i + 1) % 10 == 0:
                print(f"Progress: {i+1}/{len(all_books)} books done, {total_inserted} underlines so far")

    print(f"\nDone! {total_inserted} underlines inserted for {len(all_books)} books")
    if failed:
        print(f"Failed books ({len(failed)}): {failed}")


if __name__ == '__main__':
    main()
