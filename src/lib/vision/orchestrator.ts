import { getAnthropicClient } from "./client";
import { BookAnalyzer } from "./analyzers/book-analyzer";
import type { ImageInput, OcrContext, FullAnalysisResult, TextBlock } from "./types";

type RawImageAnalysis = {
  fullText: string;
  pageNumber: string | null;
  headerText: string;
  footerText: string;
  highlightedTexts: string[];
};

const IMAGE_ANALYSIS_PROMPT = `이 책 페이지를 분석하세요. JSON만 반환하고 다른 텍스트는 출력하지 마세요.

{
  "fullText": "인쇄된 전체 텍스트 (\\n으로 줄바꿈, 손글씨 메모 제외)",
  "pageNumber": "페이지 번호 숫자 문자열 또는 null",
  "headerText": "페이지 최상단 인쇄 텍스트 — 챕터명·책 제목·저자 등 책 식별에 쓸 수 있는 줄. 없으면 빈 문자열",
  "footerText": "페이지 최하단 인쇄 텍스트 — 책 제목·챕터명 등. 없으면 빈 문자열",
  "highlightedTexts": [
    "독자가 표시한 텍스트 조각들의 배열"
  ]
}

highlightedTexts 감지 기준:
- 형광펜 (모든 색상), 볼펜·연필 직선/물결 밑줄
- 동그라미·타원으로 감싼 텍스트
- 괄호·세로선으로 표시한 블록
- 손글씨 메모는 제외, 인쇄 텍스트에 표시된 것만
- 각 구간을 별도 원소로 분리, 없으면 []`;

export class VisionOrchestrator {
  private bookAnalyzer: BookAnalyzer;

  constructor() {
    const client = getAnthropicClient();
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY ?? "";
    this.bookAnalyzer = new BookAnalyzer(client, kakaoApiKey);
  }

  async analyze(image: ImageInput): Promise<FullAnalysisResult> {
    // Step 1: 단일 Claude Vision 호출로 OCR + 형광펜 + 페이지번호 + 헤더/푸터 추출
    const raw = await this.extractFromImage(image);

    const ocrContext: OcrContext = {
      fullText: raw.fullText,
      blocks: this.toBlocks(raw.fullText),
      headerText: raw.headerText,
      footerText: raw.footerText,
    };

    const highlights = this.toHighlightResult(raw.highlightedTexts, raw.fullText);

    // Step 2: 책 식별 (OCR 컨텍스트로 텍스트 기반 전략 우선, 실패 시 Vision fallback)
    const book = await this.bookAnalyzer.analyze(image, ocrContext);

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

  private async extractFromImage(image: ImageInput): Promise<RawImageAnalysis> {
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
            { type: "text", text: IMAGE_ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}") as Partial<RawImageAnalysis>;
      return {
        fullText: parsed.fullText ?? "",
        pageNumber: parsed.pageNumber ?? null,
        headerText: parsed.headerText ?? "",
        footerText: parsed.footerText ?? "",
        highlightedTexts: Array.isArray(parsed.highlightedTexts)
          ? parsed.highlightedTexts.filter((s): s is string => typeof s === "string")
          : [],
      };
    } catch {
      throw new Error("Claude 응답 파싱 실패");
    }
  }

  // fullText를 줄 단위로 분해해 가상 TextBlock 생성
  private toBlocks(fullText: string): TextBlock[] {
    return fullText
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map((line, i) => ({
        text: line.trim(),
        boundingBox: { x: 0, y: i * 40, width: 400, height: 36 },
      }));
  }

  private toHighlightResult(
    segments: string[],
    fullText: string
  ): FullAnalysisResult["highlights"] {
    const ranges: { start: number; end: number }[] = [];
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const idx = fullText.indexOf(trimmed);
      if (idx >= 0) {
        ranges.push({ start: idx, end: idx + trimmed.length });
      }
    }
    return { segments, ranges };
  }
}
