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

function buildContextPrompt(fullText: string): string {
  return `이 책 페이지 이미지에서 독자가 시각적으로 표시한(밑줄·형광펜·동그라미 등) 텍스트를 찾아주세요.

아래는 이 페이지를 OCR한 전체 텍스트입니다:
---
${fullText}
---

지시사항:
1. 이미지에서 시각적으로 표시된 부분을 확인하세요.
2. 위 OCR 텍스트에서 표시된 구간을 한 글자도 바꾸지 말고 그대로 복사하세요.
3. 줄바꿈은 제거하고 앞뒤 텍스트를 자연스럽게 이어 붙이세요. 한국어 조사·어미는 앞 단어에 바로 붙습니다 (예: '결핍\n을' → '결핍을', '풀어\n본' → '풀어본').
4. 수정·요약·번역 절대 금지 — 반드시 위 텍스트에 있는 문자 그대로 복사하세요.
5. 표시된 구간이 없으면 빈 배열 []을 반환하세요.

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
      if (!Array.isArray(parsed.highlightedTexts)) return [];
      return parsed.highlightedTexts
        .filter((s: unknown) => typeof s === "string" && s.trim())
        .map((s: string) => this.normalizeSegment(s));
    } catch {
      return [];
    }
  }

  private normalizeSegment(text: string): string {
    return (
      text
        // 줄바꿈 제거 후 앞뒤 공백 정리
        .replace(/[ \t]*\r?\n[ \t]*/g, " ")
        // 연속 공백 → 단일 공백
        .replace(/[ \t]{2,}/g, " ")
        // 한국어 조사: 공백 + 단일 조사 음절 → 공백 제거 (을/를/이/가/은/는/의/에/와/과/로/도/만/서/야/며)
        .replace(
          /([가-힣]) (을|를|이|가|은|는|의|와|과|로|도|만|서|야|며|랑|고|면|야|아|요)/g,
          (_, prev, particle) => prev + particle
        )
        .trim()
    );
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

    // 2) 공백·줄바꿈 유연 매칭
    try {
      const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped.replace(/\s+/g, "\\s+"));
      const m = pattern.exec(fullText);
      if (m) return { start: m.index, end: m.index + m[0].length };
    } catch {
      // ignore
    }

    // 3) 한글 정규화 매칭 — 구두점·따옴표·공백 제거 후 위치 매핑
    const normalized = this.findRangeNormalized(segment, fullText);
    if (normalized) return normalized;

    // 4) 앞부분 단어 앵커 — 시작 위치 추정 후 세그먼트 길이만큼 확보
    const words = segment.split(/\s+/).filter((w) => w.length > 1);
    if (words.length >= 2) {
      try {
        const anchor = words
          .slice(0, Math.min(4, words.length))
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("\\s*");
        const m = new RegExp(anchor).exec(fullText);
        if (m) {
          const end = Math.min(fullText.length, m.index + segment.length);
          return { start: m.index, end };
        }
      } catch {
        // ignore
      }
    }

    // 5) 부분 일치 — 세그먼트 중간 70% 로 위치를 추정하고 전체 범위 확보
    if (segment.length >= 15) {
      const subLen = Math.floor(segment.length * 0.7);
      const offset = Math.floor((segment.length - subLen) / 2);
      const core = segment.slice(offset, offset + subLen).trim();
      if (core.length > 5) {
        const coreIdx = fullText.indexOf(core);
        if (coreIdx >= 0) {
          const start = Math.max(0, coreIdx - offset);
          const end = Math.min(fullText.length, start + segment.length);
          return { start, end };
        }
      }
    }

    return null;
  }

  private findRangeNormalized(
    segment: string,
    fullText: string
  ): { start: number; end: number } | null {
    const isStrippable = (ch: string) =>
      /[\s.,!?:;'"''""‘’“”…·—\-（）()【】]/.test(ch);

    const normSeg = [...segment].filter((c) => !isStrippable(c)).join("");
    if (normSeg.length < 5) return null;

    // fullText → 정규화 문자열 + 원본 인덱스 매핑 테이블
    const charMap: number[] = [];
    let normFull = "";
    for (let i = 0; i < fullText.length; i++) {
      if (!isStrippable(fullText[i])) {
        charMap.push(i);
        normFull += fullText[i];
      }
    }

    const pos = normFull.indexOf(normSeg);
    if (pos < 0) return null;

    const start = charMap[pos];
    const endNorm = pos + normSeg.length;
    const end =
      endNorm < charMap.length ? charMap[endNorm] : charMap[charMap.length - 1] + 1;

    return { start, end };
  }
}
