import { NextResponse } from "next/server";

type TextBlock = {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
};

type KakaoDoc = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  isbn: string;
};

const PAGE_NUMBER_RE = /^\d{1,4}$/;

function isUseless(text: string) {
  const t = text.trim();
  return !t || PAGE_NUMBER_RE.test(t) || t.length < 2;
}

async function searchKakao(query: string): Promise<KakaoDoc | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey || !query.trim()) return null;

  const res = await fetch(
    `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=1`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  return data.documents?.[0] ?? null;
}

async function extractWithClaude(fullText: string): Promise<{ title: string | null; author: string | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { title: null, author: null };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `다음은 책 페이지를 OCR로 추출한 텍스트입니다. 책 제목과 저자명을 추출해주세요.
확신할 수 없으면 null을 반환하세요.
반드시 JSON만 응답하세요: {"title": "...", "author": "..."}

텍스트:
${fullText.slice(0, 600)}`,
        },
      ],
    }),
  });

  if (!res.ok) return { title: null, author: null };

  const data = await res.json();
  const content = data.content?.[0]?.text ?? "";

  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // 파싱 실패 시 무시
  }
  return { title: null, author: null };
}

export async function POST(request: Request) {
  const { fullText, blocks } = await request.json() as {
    fullText: string;
    blocks: TextBlock[];
  };

  if (!fullText && (!blocks || blocks.length === 0)) {
    return NextResponse.json({ book: null, method: "none" });
  }

  // 블록 전체 높이 추정 (이미지 높이 대용)
  const maxY = Math.max(...(blocks ?? []).map((b) => b.boundingBox.y + b.boundingBox.height), 1000);

  // ① 상단 헤더 텍스트 (y < 15%)
  const headerText = (blocks ?? [])
    .filter((b) => b.boundingBox.y < maxY * 0.15 && !isUseless(b.text))
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y)
    .map((b) => b.text)
    .join(" ")
    .trim();

  if (headerText) {
    const book = await searchKakao(headerText);
    if (book) return NextResponse.json({ book, method: "header" });
  }

  // ② 하단 푸터 텍스트 (y > 85%)
  const footerText = (blocks ?? [])
    .filter((b) => b.boundingBox.y > maxY * 0.85 && !isUseless(b.text))
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y)
    .map((b) => b.text)
    .join(" ")
    .trim();

  if (footerText) {
    const book = await searchKakao(footerText);
    if (book) return NextResponse.json({ book, method: "footer" });
  }

  // ③ 첫 번째 의미있는 줄 (짧고 제목처럼 생긴 줄)
  const firstMeaningfulLine = (fullText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length >= 2 && l.length <= 40 && !PAGE_NUMBER_RE.test(l));

  if (firstMeaningfulLine) {
    const book = await searchKakao(firstMeaningfulLine);
    if (book) return NextResponse.json({ book, method: "first-line" });
  }

  // ④ Claude로 제목/저자 추출 → 카카오 검색
  const { title, author } = await extractWithClaude(fullText ?? "");
  if (title) {
    const query = author ? `${title} ${author}` : title;
    const book = await searchKakao(query);
    if (book) return NextResponse.json({ book, method: "claude" });
  }

  return NextResponse.json({ book: null, method: "none" });
}
