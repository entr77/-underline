import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", q.trim());
    url.searchParams.set("per_page", "12");
    url.searchParams.set("orientation", "squarish");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Unsplash 요청 실패" }, { status: res.status });
    }

    const data = await res.json() as {
      results: { urls: { small: string; regular: string }; alt_description: string | null }[];
    };

    const images = data.results.map((r) => ({
      thumb: r.urls.small,
      url: r.urls.regular,
    }));

    return NextResponse.json({ images });
  } catch (err) {
    console.error("Image search error:", err);
    return NextResponse.json({ error: "이미지 검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
