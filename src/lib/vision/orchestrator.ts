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
const OCR_PROMPT = `이 책 페이지를 정확하게 OCR하세요. JSON만 반환하고 다른 텍스트는 출력하지 마세요.

규칙:
- fullText: 인쇄된 본문 텍스트 전체를 원문 그대로. 줄바꿈은 \\n. 손글씨·낙서 제외
- headerText: 페이지 최상단의 작은 텍스트 (한국 책은 보통 짝수 페이지=책 제목, 홀수 페이지=챕터명). 없으면 ""
- footerText: 페이지 최하단의 작은 텍스트 (제목·챕터명, 페이지 번호 제외). 없으면 ""
- pageNumber: 페이지 번호 숫자만 문자열로. 없으면 null

{
  "fullText": "...",
  "pageNumber": "75",
  "headerText": "부자 아빠 가난한 아빠",
  "footerText": ""
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
      model: "claude-sonnet-4-6",
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
