import { getAnthropicClient } from "./client";
import { BookAnalyzer } from "./analyzers/book-analyzer";
import { HighlightAnalyzer } from "./analyzers/highlight-analyzer";
import type { ImageInput, OcrContext, FullAnalysisResult, TextBlock } from "./types";

type RawOcr = {
  fullText: string;
  pageNumber: string | null;
  headerText: string;
  footerText: string;
};

// OCR 전용 프롬프트 — 밑줄 감지 제외로 집중도 향상
const OCR_PROMPT = `이 책 페이지의 텍스트를 OCR하세요. JSON만 반환하고 다른 텍스트는 출력하지 마세요.

{
  "fullText": "인쇄된 전체 텍스트 (\\n으로 줄바꿈, 손글씨 메모 제외)",
  "pageNumber": "페이지 번호 숫자 문자열 또는 null",
  "headerText": "페이지 최상단 줄 — 챕터명·책 제목·저자 등. 없으면 빈 문자열",
  "footerText": "페이지 최하단 줄 — 책 제목·챕터명 등. 없으면 빈 문자열"
}`;

export class VisionOrchestrator {
  private bookAnalyzer: BookAnalyzer;

  constructor() {
    const client = getAnthropicClient();
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY ?? "";
    this.bookAnalyzer = new BookAnalyzer(client, kakaoApiKey);
  }

  async analyze(image: ImageInput): Promise<FullAnalysisResult> {
    // Step 1: OCR 전용 호출 — fullText 확보 후 밑줄 감지에 컨텍스트로 제공
    const raw = await this.extractOcr(image);

    const ocrContext: OcrContext = {
      fullText: raw.fullText,
      blocks: this.toBlocks(raw.fullText),
      headerText: raw.headerText,
      footerText: raw.footerText,
    };

    // Step 2: 밑줄 감지 + 책 식별을 병렬 실행 (OCR fullText를 각각 컨텍스트로 제공)
    const client = getAnthropicClient();
    const highlightAnalyzer = new HighlightAnalyzer(client);

    const [highlights, book] = await Promise.all([
      highlightAnalyzer.analyze(image, ocrContext),
      this.bookAnalyzer.analyze(image, ocrContext),
    ]);

    return {
      fullText: raw.fullText,
      blocks: ocrContext.blocks,
      detectedUnderlineRanges: highlights.ranges,
      pageNumber: raw.pageNumber,
      headerText: raw.headerText,
      highlights,
      pageNumberResult: {
        pageNumber: raw.pageNumber,
        confidence: raw.pageNumber !== null ? "high" : "low",
      },
      book,
    };
  }

  private async extractOcr(image: ImageInput): Promise<RawOcr> {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            { type: "text", text: OCR_PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}") as Partial<RawOcr>;
      return {
        fullText: parsed.fullText ?? "",
        pageNumber: parsed.pageNumber ?? null,
        headerText: parsed.headerText ?? "",
        footerText: parsed.footerText ?? "",
      };
    } catch {
      throw new Error("Claude OCR 응답 파싱 실패");
    }
  }

  private toBlocks(fullText: string): TextBlock[] {
    return fullText
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map((line, i) => ({
        text: line.trim(),
        boundingBox: { x: 0, y: i * 40, width: 400, height: 36 },
      }));
  }
}
