#!/usr/bin/env python3
"""
밑줄 없는 책 재처리 — 순차 실행으로 rate limit 방지
"""

import json
import os
import random
import urllib.request
import urllib.error
import time

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
CARD_BG_URLS = ["#1C1917", "#F7F3EE", "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)"]
CARD_ALIGNS = ["left", "left", "center"]
CARD_VALIGNS = ["bottom", "center"]


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
        body_text = e.read().decode()[:300]
        print(f"    INSERT ERROR {e.code}: {body_text}")
        return e.code
    except Exception as e:
        print(f"    INSERT EXCEPTION: {e}")
        return 0


def call_claude(messages, max_tokens=1500):
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
    for attempt in range(4):
        try:
            resp = urllib.request.urlopen(req, timeout=60)
            data = json.loads(resp.read())
            return data['content'][0]['text']
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            if e.code == 429:
                wait = 10 * (attempt + 1)
                print(f"    Rate limit (429), waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    Claude error {e.code}: {err[:100]}")
                if attempt == 3:
                    raise
                time.sleep(3)
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def generate_quotes(title, author, genre):
    prompt = f"""당신은 독서 전문가입니다. 아래 책의 명문장/핵심 구절 5개를 작성하세요.

책: {title} / {author} ({genre})

규칙:
- 각 문장 20자~150자, 한국어
- 책의 주제·감성을 담은 밑줄 그을 만한 문장
- 따옴표·번호·설명 없이 문장만, 한 줄에 하나씩, 정확히 5개"""

    text = call_claude([{"role": "user", "content": prompt}])
    lines = [l.strip().lstrip('0123456789.-) ').strip().strip('"\'""''') for l in text.strip().split('\n') if l.strip()]
    quotes = [l for l in lines if len(l) >= 15 and '책의' not in l and '저자' not in l][:5]
    while len(quotes) < 5:
        quotes.append(f"{title}에서 마음에 남은 한 문장, {author}의 목소리로.")
    return quotes


def get_users_for_genre(genre, all_users):
    patterns = GENRE_PATTERNS.get(genre, [])
    matched = [u for u in all_users if any(p in u['username'] for p in patterns)]
    if len(matched) < 2:
        extras = [u for u in all_users if u not in matched]
        random.shuffle(extras)
        matched = matched + extras
    return matched[:2]


def main():
    retry_books = json.load(open('/Users/entr/Documents/GitHub/underline/.tmp/retry_books.json'))
    print(f"재처리 대상: {len(retry_books)}권")

    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/users?select=id,username",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-999'}
    )
    all_users = [u for u in json.loads(urllib.request.urlopen(req).read()) if u['username'] != 'entr']
    print(f"시드 유저: {len(all_users)}명")

    total = 0
    failed = []

    for i, book in enumerate(retry_books):
        title = book['title']
        author = book['author']
        genre = book.get('genre', '소설')
        book_id = book['id']

        try:
            quotes = generate_quotes(title, author, genre)
            users = get_users_for_genre(genre, all_users)

            rows = []
            for user in users:
                for quote in quotes:
                    card_bg = random.choice(CARD_BGS)
                    row = {
                        "user_id": user['id'],
                        "book_id": book_id,
                        "content": quote,
                        "page_number": random.randint(10, 400),
                        "is_public": True,
                        "card_bg": card_bg,
                        "card_bg_url": random.choice(CARD_BG_URLS) if card_bg == "color" else None,
                        "card_font": "serif",
                        "card_align": random.choice(CARD_ALIGNS),
                        "card_valign": random.choice(CARD_VALIGNS),
                    }
                    rows.append(row)

            # Insert all at once
            status = supabase_post("underlines", rows)
            if status in (200, 201, 204):
                total += len(rows)
                print(f"[{i+1}/{len(retry_books)}] OK [{genre}] {title[:30]} → {len(rows)}개")
            else:
                failed.append(title)
                print(f"[{i+1}/{len(retry_books)}] FAIL status={status} [{genre}] {title[:30]}")

        except Exception as e:
            failed.append(title)
            print(f"[{i+1}/{len(retry_books)}] EXCEPTION {title[:25]}: {e}")

        # Rate limit 방지: 책마다 0.5초 대기
        time.sleep(0.5)

    print(f"\n완료: {total}개 밑줄 삽입, 실패: {len(failed)}권")
    if failed:
        print("실패:", failed[:10])


if __name__ == '__main__':
    main()
