import type Anthropic from "@anthropic-ai/sdk";
import type { ImageInput, OcrContext, PageNumberResult } from "../types";

const PAGE_NUMBER_PATTERN = /^\d{1,4}$/;

export class PageNumberAnalyzer {
  constructor(private client: Anthropic) {}

  async analyze(image: ImageInput, context?: OcrContext): Promise<PageNumberResult> {
    // 컨텍스트가 있으면 텍스트 기반 우선 (Claude 호출 불필요)
    if (context) {
      const result = this.fromContext(context);
      if (result.pageNumber !== null) return result;
    }

    // Fallback: Claude Vision으로 직접 탐지
    return this.fromVision(image);
  }

  private fromContext(context: OcrContext): PageNumberResult {
    // blocks 기반 탐지 (숫자만 있는 짧은 블록)
    for (const block of context.blocks) {
      if (PAGE_NUMBER_PATTERN.test(block.text.trim())) {
        return { pageNumber: block.text.trim(), confidence: "high" };
      }
    }

    // fullText 줄 기반 탐지
    for (const line of context.fullText.split("\n")) {
      if (PAGE_NUMBER_PATTERN.test(line.trim())) {
        return { pageNumber: line.trim(), confidence: "medium" };
      }
    }

    return { pageNumber: null, confidence: "low" };
  }

  private async fromVision(image: ImageInput): Promise<PageNumberResult> {
    const message = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
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
              text: `이 책 페이지의 페이지 번호를 찾아주세요. JSON만 반환하세요: {"pageNumber": "숫자" 또는 null}`,
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}");
      return {
        pageNumber: typeof parsed.pageNumber === "string" ? parsed.pageNumber : null,
        confidence: "medium",
      };
    } catch {
      return { pageNumber: null, confidence: "low" };
    }
  }
}
