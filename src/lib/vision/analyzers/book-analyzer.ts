import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext, BookResult } from "../types";

type BookStrategy = "header" | "footer" | "first-line" | "claude-text" | "claude-image";

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
    // ① 헤더 텍스트 (챕터명, 책 제목 등 상단 인쇄 정보)
    if (context?.headerText) {
      const result = await this.searchKakao(context.headerText, "header");
      if (result) return result;
    }

    // ② 푸터 텍스트 (하단 책 정보)
    if (context?.footerText) {
      const result = await this.searchKakao(context.footerText, "footer");
      if (result) return result;
    }

    // ③ fullText 첫 번째 의미있는 줄
    if (context?.fullText) {
      const result = await this.tryFirstLine(context.fullText);
      if (result) return result;
    }

    // ④ Claude 텍스트 분석으로 제목/저자 추출
    if (context?.fullText) {
      const result = await this.tryClaudeText(context.fullText);
      if (result) return result;
    }

    // ⑤ Claude Vision으로 이미지 직접 분석 (최종 fallback)
    return this.tryClaudeImage(image);
  }

  private async tryFirstLine(fullText: string): Promise<BookResult> {
    const firstLine = fullText
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length >= 2 && l.length <= 40 && !PAGE_NUMBER_RE.test(l));

    if (!firstLine) return null;
    return this.searchKakao(firstLine, "first-line");
  }

  private async tryClaudeText(fullText: string): Promise<BookResult> {
    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `다음 책 페이지 OCR 텍스트에서 책 제목과 저자명을 추출하세요.
확신할 수 없으면 null을 사용하세요.
JSON만 반환: {"title": "...", "author": "..."}

텍스트:
${fullText.slice(0, 600)}`,
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
      return this.searchKakao(query, "claude-text");
    } catch {
      return null;
    }
  }

  private async tryClaudeImage(image: ImageInput): Promise<BookResult> {
    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
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
              text: `이 책 페이지에서 책 제목과 저자를 찾아주세요. JSON만 반환: {"title": "...", "author": "..."}`,
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
      const res = await fetch(
        `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=1`,
        { headers: { Authorization: `KakaoAK ${this.kakaoApiKey}` } }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const doc = data.documents?.[0] as KakaoDoc | undefined;
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
