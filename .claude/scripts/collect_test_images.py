import os
from icrawler.builtin import BingImageCrawler, GoogleImageCrawler

BASE_DIR = "/Users/entr/Documents/GitHub/underline/.tmp/test-images"

QUERIES = [
    ("highlight",  "책 형광펜 밑줄 사진"),
    ("highlight",  "book highlighter underline page close up"),
    ("pen",        "책 볼펜 연필 밑줄 필기"),
    ("pen",        "book pen pencil annotation underline"),
    ("multicolor", "밀드라이너 책 밑줄 여러 색"),
    ("multicolor", "mildliner book highlighted multiple colors"),
    ("circle",     "책 동그라미 괄호 표시"),
    ("circle",     "book circled text bracket annotation"),
    ("postit",     "책 포스트잇 메모지 밑줄"),
    ("postit",     "book sticky note page reading"),
    ("glare",      "책 사진 빛반사 역광"),
    ("glare",      "book page photo glare light reflection"),
    ("dark",       "책 독서등 어두운 조명 사진"),
    ("dark",       "book page low light dark reading photo"),
    ("curved",     "책 펼쳐진 곡면 페이지"),
    ("curved",     "open book spread curved page photo"),
    ("english",    "english book highlighted sentences page"),
    ("english",    "book annotation highlighted underlined text"),
    ("korean",     "한국 소설 책 형광펜 밑줄 페이지"),
    ("korean",     "한글 책 밑줄 표시 사진"),
]

PER_QUERY = 8

def collect():
    total = 0
    for category, query in QUERIES:
        cat_dir = os.path.join(BASE_DIR, category)
        os.makedirs(cat_dir, exist_ok=True)

        # 기존 파일 수 체크
        existing = len([f for f in os.listdir(cat_dir) if not f.startswith('.')])
        if existing >= 16:
            print(f"[{category}] 이미 {existing}개 있음, 스킵")
            continue

        print(f"[{category}] 검색: {query}")
        try:
            crawler = BingImageCrawler(
                storage={"root_dir": cat_dir},
                downloader_threads=4,
                parser_threads=2,
            )
            crawler.crawl(
                keyword=query,
                max_num=PER_QUERY,
                min_size=(300, 300),
                file_idx_offset="auto",
            )
            after = len([f for f in os.listdir(cat_dir) if not f.startswith('.')])
            added = after - existing
            print(f"  → {added}개 추가 (합계 {after}개)")
            total += added
        except Exception as e:
            print(f"  ✗ 오류: {e}")

    print(f"\n완료: 총 {total}개 추가")
    # 카테고리별 현황 출력
    print("\n[카테고리별 현황]")
    for cat in sorted(os.listdir(BASE_DIR)):
        cat_path = os.path.join(BASE_DIR, cat)
        if os.path.isdir(cat_path):
            n = len([f for f in os.listdir(cat_path) if not f.startswith('.')])
            print(f"  {cat}: {n}개")

if __name__ == "__main__":
    collect()
