import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext, HighlightResult } from "../types";

const BASE_PROMPT = `이 책 페이지 이미지에서 독자가 시각적으로 표시한 텍스트를 모두 찾아주세요.

감지 대상:
- 형광펜 (모든 색상), 볼펜·연필 직선/물결 밑줄
- 동그라미·타원으로 감싼 텍스트
- 괄호·세로선으로 표시한 블록

규칙:
- 손글씨 메모·낙서는 제외, 인쇄 텍스트에 표시된 것만
- 각 구간을 별도 배열 원소로 분리 (여러 줄에 걸치면 하나로 합치기)
- 표시 없으면 빈 배열 []

JSON만 반환: {"highlightedTexts": ["...조각1...", "...조각2..."]}`;

// fullText가 있을 때: Claude에게 "이 텍스트에서 표시된 부분 그대로 복사"를 지시
// → Claude가 paraphrase하지 않고 정확한 원문을 반환해 범위 매핑 정확도 향상
function buildContextPrompt(fullText: string): string {
  return `이 책 페이지 이미지에서 독자가 시각적으로 표시한(밑줄·형광펜·동그라미 등) 텍스트를 찾아주세요.

아래는 이 페이지를 OCR한 전체 텍스트입니다:
---
${fullText}
---

위 텍스트에서 이미지에 시각적으로 표시된 부분을 찾아, 위 텍스트에서 그대로 복사해 반환하세요.
절대 수정·요약·번역하지 말고, 위 텍스트에 있는 문자 그대로 복사하세요.
각 표시 구간을 별도 배열 원소로 분리하고, 없으면 빈 배열 []로 반환하세요.

JSON만 반환: {"highlightedTexts": ["...원문 그대로...", "..."]}`;
}

export class HighlightAnalyzer {
  constructor(private client: Anthropic) {}

  async analyze(image: ImageInput, context?: OcrContext): Promise<HighlightResult> {
    const prompt = context?.fullText
      ? buildContextPrompt(context.fullText)
      : BASE_PROMPT;

    const message = await this.client.messages.create({
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
            { type: "text", text: prompt },
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

      const range = this.findRange(trimmed, fullText);
      if (range) ranges.push(range);
    }

    return ranges;
  }

  private findRange(
    segment: string,
    fullText: string
  ): { start: number; end: number } | null {
    // 1) 완전 일치
    const exact = fullText.indexOf(segment);
    if (exact >= 0) return { start: exact, end: exact + segment.length };

    // 2) 공백·줄바꿈 유연 매칭 — \n vs 공백 차이를 정규식으로 처리
    try {
      const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped.replace(/\s+/g, "\\s+"));
      const m = pattern.exec(fullText);
      if (m) return { start: m.index, end: m.index + m[0].length };
    } catch {
      // 정규식 생성 실패 시 다음 전략으로
    }

    // 3) 앞부분 단어 매칭 — 긴 세그먼트의 시작부분으로 대략적인 위치 탐지
    const words = segment.split(/\s+/).filter((w) => w.length > 1);
    if (words.length >= 2) {
      try {
        const anchor = words
          .slice(0, Math.min(4, words.length))
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("\\s+");
        const m = new RegExp(anchor).exec(fullText);
        if (m) return { start: m.index, end: m.index + m[0].length };
      } catch {
        // ignore
      }
    }

    return null;
  }
}
