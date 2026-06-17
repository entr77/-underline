import { NextRequest, NextResponse } from "next/server";

export type KakaoBook = {
  kakao_id: string;
  title: string;
  author: string;
  publisher: string;
  cover_url: string;
  isbn: string;
};

type KakaoDocument = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  isbn: string;
};

type KakaoResponse = {
  documents: KakaoDocument[];
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const url = new URL("https://dapi.kakao.com/v3/search/book");
    url.searchParams.set("query", q.trim());
    url.searchParams.set("size", "5");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "카카오 API 요청 실패" },
        { status: res.status }
      );
    }

    const data: KakaoResponse = await res.json();

    const books: KakaoBook[] = data.documents.map((doc) => {
      // isbn field can be "9788934935919 8934935917" — take the last (13-digit) isbn
      const isbnParts = (doc.isbn ?? "").trim().split(" ");
      const isbn = isbnParts[isbnParts.length - 1] || isbnParts[0] || "";

      return {
        kakao_id: isbn || doc.title, // fallback to title if no isbn
        title: doc.title,
        author: (doc.authors ?? []).join(", "),
        publisher: doc.publisher ?? "",
        cover_url: doc.thumbnail ?? "",
        isbn,
      };
    });

    return NextResponse.json(books);
  } catch (err) {
    console.error("Books search error:", err);
    return NextResponse.json({ error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
