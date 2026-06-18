import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext, HighlightResult } from "../types";

const PROMPT = `이 책 페이지에서 독자가 표시한 텍스트를 모두 찾아주세요. JSON만 반환하세요.

{"highlightedTexts": ["표시된 텍스트 조각 1", "표시된 텍스트 조각 2"]}

감지 대상 (모두 포함):
- 형광펜 (노랑·초록·주황·분홍·파랑 등 모든 색상)
- 볼펜·연필 직선 밑줄 또는 물결 밑줄
- 동그라미·타원으로 감싼 텍스트
- 괄호·세로선으로 표시한 텍스트 블록

규칙:
- 손글씨 메모·낙서는 제외, 인쇄 텍스트에 표시된 것만 추출
- 각 구간을 별도 배열 원소로 분리
- 한 표시가 여러 줄에 걸치면 하나의 원소로 합치기
- 표시 없으면 빈 배열 []`;

export class HighlightAnalyzer {
  constructor(private client: Anthropic) {}

  async analyze(image: ImageInput, context?: OcrContext): Promise<HighlightResult> {
    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const segments = this.parseSegments(rawText);
    const ranges = this.toRanges(segments, context?.fullText ?? "");

    return { segments, ranges };
  }

  private parseSegments(rawText: string): string[] {
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}");
      return Array.isArray(parsed.highlightedTexts)
        ? parsed.highlightedTexts.filter((s: unknown) => typeof s === "string" && s.trim())
        : [];
    } catch {
      return [];
    }
  }

  private toRanges(
    segments: string[],
    fullText: string
  ): { start: number; end: number }[] {
    const ranges: { start: number; end: number }[] = [];
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const idx = fullText.indexOf(trimmed);
      if (idx >= 0) {
        ranges.push({ start: idx, end: idx + trimmed.length });
      }
    }
    return ranges;
  }
}
