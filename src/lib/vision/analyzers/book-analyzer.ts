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
    // ① 헤더: 전체 + 구분자(|ㅣ-—·) 기준 파싱 후 각 파트 시도
    if (context?.headerText) {
      const headerParts = this.splitTextParts(context.headerText);
      for (const part of headerParts) {
        const result = await this.searchKakao(part, "header");
        if (result) return result;
      }
    }

    // ② 푸터: 전체 + 파싱 파트 시도
    if (context?.footerText) {
      const footerParts = this.splitTextParts(context.footerText);
      for (const part of footerParts) {
        const result = await this.searchKakao(part, "footer");
        if (result) return result;
      }
    }

    // ③ fullText 상위 3줄 병렬 검색
    if (context?.fullText) {
      const result = await this.tryFirstLines(context.fullText);
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

  // "챕터명 | 책 제목" 등 구분자로 나뉜 경우 각 파트를 순서대로 반환 (전체 포함)
  private splitTextParts(text: string): string[] {
    const parts = text.split(/[|ㅣ\-—·]/).map((p) => p.trim()).filter((p) => !isUseless(p));
    const unique = [...new Set([text.trim(), ...parts])].filter((p) => !isUseless(p));
    return unique;
  }

  private async tryFirstLines(fullText: string): Promise<BookResult> {
    const candidates = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length >= 3 && l.length <= 60 && !PAGE_NUMBER_RE.test(l))
      .slice(0, 3);

    if (candidates.length === 0) return null;

    const results = await Promise.all(
      candidates.map((line) => this.searchKakao(line, "first-line"))
    );
    return results.find((r) => r !== null) ?? null;
  }

  private async tryClaudeText(fullText: string): Promise<BookResult> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `다음은 책의 한 페이지 본문입니다. 어느 책인지 알려주세요.

단서:
- 등장인물, 고유명사, 전문 용어, 문체, 특정 개념어
- 번역서라면 원제·역자명도 고려해 한국어 제목으로 답하세요
- 확신이 없어도 가능성이 가장 높은 책 하나를 제시하세요 (전혀 알 수 없으면 null)

JSON만 반환: {"title": "한국어 책 제목", "author": "저자명 (한국어 표기)"}

본문:
${fullText.slice(0, 1200)}`,
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
      model: "claude-sonnet-4-6",
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
