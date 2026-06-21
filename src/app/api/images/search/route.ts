import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/vision/client";

async function extractKeywords(text: string): Promise<string> {
  const client = getAnthropicClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages: [{
      role: "user",
      content: `You are choosing a background photo for a book quote card. Extract 2-3 English keywords that capture the MOOD and THEME of this passage — words that would find beautiful, atmospheric stock photos (nature, objects, abstract, scenes). Avoid generic words. Output ONLY the keywords separated by spaces.

Passage: ${text}`,
    }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return raw || "book reading atmosphere";
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const text = request.nextUrl.searchParams.get("text");

  if (!q && !text) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    let query: string;

    if (text) {
      query = await extractKeywords(text);
    } else {
      query = q!.trim();
    }

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "24");
    url.searchParams.set("orientation", "squarish");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Unsplash 요청 실패" }, { status: res.status });
    }

    const data = await res.json() as {
      results: { urls: { small: string; regular: string } }[];
    };

    const images = data.results.map((r) => ({
      thumb: r.urls.small,
      url: r.urls.regular,
    }));

    return NextResponse.json({ images, query });
  } catch (err) {
    console.error("Image search error:", err);
    return NextResponse.json({ error: "이미지 검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
