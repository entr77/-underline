import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext, BookResult } from "../types";

type BookStrategy = "header" | "footer" | "claude-multi" | "gpt-multi" | "google-books" | "claude-image";

type KakaoDoc = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  isbn: string;
};

const PAGE_NUMBER_RE = /^\d{1,4}$/;

function isUseless(text: string): boolean {
  const t = text.trim();
  return !t || PAGE_NUMBER_RE.test(t) || t.length < 2;
}

export class BookAnalyzer {
  constructor(
    private client: Anthropic,
    private kakaoApiKey: string
  ) {}

  // 전략을 순서대로 시도하고 첫 번째 성공 결과를 반환
  async analyze(image: ImageInput, context?: OcrContext): Promise<BookResult> {
    const openaiKey = process.env.OPENAI_API_KEY;

    // ① GPT-4o 텍스트 분석 (키가 있을 때 우선 시도)
    if (openaiKey && context?.fullText) {
      const result = await this.tryGptMulti(context.fullText, openaiKey);
      if (result) return result;
    }

    // ② Claude 텍스트 분석 — GPT 없거나 실패 시 fallback
    if (context?.fullText) {
      const result = await this.tryClaudeMulti(context.fullText);
      if (result) return result;
    }

    // ③ Google Books — 본문 구절로 전문 검색
    if (context?.fullText) {
      const result = await this.tryGoogleBooks(context.fullText);
      if (result) return result;
    }

    // ④ Claude Vision — 이미지 직접 분석 (최종 fallback)
    return this.tryClaudeImage(image);
  }

  // GPT-4o에게 후보 3개를 받아 순서대로 카카오 검색 시도
  private async tryGptMulti(fullText: string, apiKey: string): Promise<BookResult> {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `다음은 책의 한 페이지 본문입니다. 어느 책인지 추측해주세요.

단서로 활용:
- 등장인물명, 지명, 고유명사
- 전문 용어, 개념어, 특정 이론
- 문체와 서술 방식 (소설/자기계발/철학/과학 등)
- 번역서라면 원어 표현·역자 주석

확신 순서대로 최대 3개 후보를 JSON 배열로 반환하세요.
전혀 알 수 없으면 빈 배열 반환.

JSON만 반환 (다른 텍스트 없이):
[
  {"title": "한국어 책 제목", "author": "저자명"},
  {"title": "두 번째 후보", "author": "저자명"}
]

본문:
${fullText.slice(0, 1500)}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`GPT API ${res.status}: ${body}`);
      }

      const data = await res.json();
      const rawText: string = data.choices?.[0]?.message?.content ?? "";

      const match = rawText.match(/\[[\s\S]*\]/);
      const candidates = JSON.parse(match?.[0] ?? "[]") as Array<{
        title?: string;
        author?: string;
      }>;

      for (const { title, author } of candidates) {
        if (!title) continue;
        if (author) {
          const result = await this.searchKakao(`${title} ${author}`, "gpt-multi");
          if (result) return result;
        }
        const result = await this.searchKakao(title, "gpt-multi");
        if (result) return result;
      }
      return null;
    } catch (err) {
      console.error("[BookAnalyzer] GPT 실패, Claude fallback:", err);
      return null;
    }
  }

  // Claude에게 후보 3개를 받아 순서대로 카카오 검색 시도
  private async tryClaudeMulti(fullText: string): Promise<BookResult> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `다음은 책의 한 페이지 본문입니다. 어느 책인지 추측해주세요.

단서로 활용:
- 등장인물명, 지명, 고유명사
- 전문 용어, 개념어, 특정 이론
- 문체와 서술 방식 (소설/자기계발/철학/과학 등)
- 번역서라면 원어 표현·역자 주석

확신 순서대로 최대 3개 후보를 JSON 배열로 반환하세요.
전혀 알 수 없으면 빈 배열 반환.

JSON만 반환 (다른 텍스트 없이):
[
  {"title": "한국어 책 제목", "author": "저자명"},
  {"title": "두 번째 후보", "author": "저자명"}
]

본문:
${fullText.slice(0, 1500)}`,
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const match = rawText.match(/\[[\s\S]*\]/);
      const candidates = JSON.parse(match?.[0] ?? "[]") as Array<{
        title?: string;
        author?: string;
      }>;

      for (const { title, author } of candidates) {
        if (!title) continue;
        // title + author 조합으로 먼저 시도
        if (author) {
          const result = await this.searchKakao(`${title} ${author}`, "claude-multi");
          if (result) return result;
        }
        // title 단독으로 재시도
        const result = await this.searchKakao(title, "claude-multi");
        if (result) return result;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Google Books API — 한국어 포함 전문(全文) 구절 검색
  // Claude 없이 OCR 텍스트에서 독특한 구절을 직접 뽑아 검색
  private async tryGoogleBooks(fullText: string): Promise<BookResult> {
    const snippet = this.pickDistinctiveSnippet(fullText);
    if (!snippet) return null;

    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(snippet)}&maxResults=3&printType=books`
      );
      if (!res.ok) return null;

      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return null;

      const info = item.volumeInfo;
      const isbn =
        info.industryIdentifiers?.find((id: { type: string }) => id.type === "ISBN_13")?.identifier ??
        `google_${item.id}`;

      // Google Books로 찾은 제목으로 Kakao에서 thumbnail·publisher 보강
      if (info.title) {
        const kakaoResult = await this.searchKakao(info.title, "google-books");
        if (kakaoResult) return kakaoResult;
      }

      return {
        title: info.title ?? "",
        author: info.authors?.join(", ") ?? "",
        publisher: info.publisher ?? "",
        thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") ?? "",
        isbn,
        strategy: "google-books",
      };
    } catch {
      return null;
    }
  }

  // 본문 중간부에서 15~45자 사이의 독특한 구절 추출
  // 헤더/푸터·숫자·짧은 줄은 제외
  private pickDistinctiveSnippet(fullText: string): string | null {
    const lines = fullText
      .split(/[\n。]/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 15 && l.length <= 80 && !/^\d+$/.test(l));
    if (!lines.length) return null;
    // 앞뒤 20%를 제외한 중간 구간에서 선택 (헤더/푸터 회피)
    const start = Math.floor(lines.length * 0.2);
    const end = Math.floor(lines.length * 0.8);
    const candidates = lines.slice(start, end);
    if (!candidates.length) return lines[Math.floor(lines.length / 2)] ?? null;
    // 고유명사·따옴표 포함 줄 우선
    const rich = candidates.find((l) => /["'「」『』《》]|[A-Z]/.test(l));
    const chosen = rich ?? candidates[Math.floor(candidates.length / 2)];
    return chosen.slice(0, 45);
  }

  private async tryClaudeImage(image: ImageInput): Promise<BookResult> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            {
              type: "text",
              text: `이 책 페이지 이미지를 분석해주세요.

확인할 것:
1. 페이지 상단(헤더)이나 하단(푸터)에 인쇄된 책 제목 또는 챕터명
2. 본문 내용·문체·고유명사·개념으로 책 추측

한국어 책 제목과 저자명으로 답하세요. 확신 없어도 가장 가능성 높은 것을 제시하세요.
JSON만 반환: {"title": "책 제목", "author": "저자명"}`,
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const { title, author } = JSON.parse(match?.[0] ?? "{}") as {
        title?: string | null;
        author?: string | null;
      };
      if (!title) return null;
      const query = author ? `${title} ${author}` : title;
      return this.searchKakao(query, "claude-image");
    } catch {
      return null;
    }
  }

  private async searchKakao(query: string, strategy: BookStrategy): Promise<BookResult> {
    if (!this.kakaoApiKey || isUseless(query)) return null;

    try {
      // 1차: 기본 검색
      const res = await fetch(
        `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=1`,
        { headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` } }
      );
      if (!res.ok) return null;

      const data = await res.json();
      let doc = data.documents?.[0] as KakaoDoc | undefined;

      // 2차: 공백·괄호·부제 제거 후 재시도 (title+author 조합이 실패한 경우)
      if (!doc && query.includes(" ")) {
        const shortQuery = query.split(" ")[0];
        if (!isUseless(shortQuery)) {
          const res2 = await fetch(
            `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(shortQuery)}&size=1&target=title`,
            { headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` } }
          );
          if (res2.ok) {
            const data2 = await res2.json();
            doc = data2.documents?.[0] as KakaoDoc | undefined;
          }
        }
      }

      if (!doc) return null;

      return {
        title: doc.title,
        author: doc.authors?.join(", ") ?? "",
        publisher: doc.publisher ?? "",
        thumbnail: doc.thumbnail ?? "",
        isbn: doc.isbn ?? "",
        strategy,
      };
    } catch {
      return null;
    }
  }
}
