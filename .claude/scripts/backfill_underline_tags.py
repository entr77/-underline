"""
기존 underlines 의 tags 를 Claude 로 분류하는 백필 스크립트.

사용법:
  python .claude/scripts/backfill_underline_tags.py

필요한 환경변수 (.env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY
"""

import os, sys, time, json, re
sys.stdout.reconfigure(encoding="utf-8")

from pathlib import Path

env_path = Path(__file__).parents[2] / ".env.local"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

try:
    import requests
except ImportError:
    print("pip install requests 를 먼저 실행하세요.")
    sys.exit(1)

SUPABASE_URL  = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY or not ANTHROPIC_KEY:
    print("환경변수가 설정되지 않았습니다.")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

EMOTION_TAGS = ["위로", "사랑", "인생", "성장", "비즈니스", "재테크", "테크/AI", "사회", "육아", "종교", "유머"]
BATCH = 20


def classify(contents: list[str]) -> list[str]:
    lines = "\n".join(f"{i+1}. {c}" for i, c in enumerate(contents))
    prompt = f"""다음 밑줄 문장들을 각각 아래 태그 중 하나로 분류하세요.
태그: 위로, 사랑, 인생, 성장, 비즈니스, 재테크, 테크/AI, 사회, 육아, 종교, 유머

위로: 공감·위안·혼자가 아님을 느끼게 하는 문장
사랑: 연애·이별·사람 사이 감정
인생: 존재·삶의 의미·철학적 통찰
성장: 노력·변화·자기계발·더 나아지기
비즈니스: 창업·경영·마케팅·직장·리더십
재테크: 투자·부동산·돈·경제적 자유
테크/AI: 기술·AI·디지털 트렌드·미래
사회: 정치·역사·사회구조·세상 읽기
육아: 아이·부모·가족·양육
종교: 신앙·영성·명상·마음 수련
유머: 재치·웃음·가벼운 통찰

{lines}

JSON 배열만 반환. 순서 유지. 예: ["위로", "성장", "철학"]"""

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
        match = re.search(r"\[[\s\S]*?\]", text)
        if not match:
            return [""] * len(contents)
        tags = json.loads(match.group())
        return [t if t in EMOTION_TAGS else "" for t in (tags + [""] * len(contents))[:len(contents)]]
    except Exception as e:
        print(f"  Claude 오류: {e}")
        return [""] * len(contents)


def fetch_all() -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/underlines",
        headers=HEADERS,
        params={"select": "id,content", "limit": "1000"},
    )
    r.raise_for_status()
    return r.json()


def update_tags(underline_id: str, tags: list[str]):
    payload = json.dumps({"tags": tags})
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/underlines",
        headers=HEADERS,
        params={"id": f"eq.{underline_id}"},
        data=payload,
    )
    r.raise_for_status()


def main():
    rows = fetch_all()
    print(f"밑줄 {len(rows)}개 재분류\n")

    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        contents = [r["content"] for r in batch]
        print(f"[{i+1}~{i+len(batch)}] Claude 분류 중...", end=" ", flush=True)
        tags = classify(contents)
        print("완료")

        for row, tag in zip(batch, tags):
            if tag:
                update_tags(row["id"], [tag])
                short = row["content"][:30].replace("\n", " ")
                print(f"  '{short}...' -> [{tag}]")

        if i + BATCH < len(rows):
            time.sleep(0.5)

    print(f"\n완료 -- {len(rows)}개 처리됨")


if __name__ == "__main__":
    main()
