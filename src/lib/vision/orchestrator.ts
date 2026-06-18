import { getAnthropicClient } from "./client";
import { BookAnalyzer } from "./analyzers/book-analyzer";
import { HighlightAnalyzer } from "./analyzers/highlight-analyzer";
import type { ImageInput, OcrContext, FullAnalysisResult, TextBlock } from "./types";

type RawOcr = {
  fullText: string;
  pageNumber: string | null;
  headerText: string;
  footerText: string;
  blocks: TextBlock[];
};

// Google Vision API 응답 타입 (필요한 부분만)
type GVVertex = { x?: number; y?: number };
type GVParagraph = {
  text?: string;
  boundingBox?: { vertices: GVVertex[] };
  words?: Array<{
    symbols?: Array<{ text?: string }>;
    boundingBox?: { vertices: GVVertex[] };
  }>;
};
type GVBlock = {
  paragraphs?: GVParagraph[];
  boundingBox?: { vertices: GVVertex[] };
};
type GVPage = { width?: number; height?: number; blocks?: GVBlock[] };

export class VisionOrchestrator {
  private bookAnalyzer: BookAnalyzer;

  constructor() {
    const client = getAnthropicClient();
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY ?? "";
    this.bookAnalyzer = new BookAnalyzer(client, kakaoApiKey);
  }

  async analyze(image: ImageInput): Promise<FullAnalysisResult> {
    // Step 1: Google Vision으로 OCR (없으면 Claude fallback)
    const raw = await this.extractOcr(image);

    const ocrContext: OcrContext = {
      fullText: raw.fullText,
      blocks: raw.blocks,
      headerText: raw.headerText,
      footerText: raw.footerText,
    };

    // Step 2: 밑줄 감지 + 책 식별 병렬
    const client = getAnthropicClient();
    const highlightAnalyzer = new HighlightAnalyzer(client);

    const [highlights, bookCandidates] = await Promise.all([
      highlightAnalyzer.analyze(image, ocrContext),
      this.bookAnalyzer.analyzeAll(image, ocrContext),
    ]);

    // analyzeAll에서 결과가 없으면 Google Books / Claude Vision fallback
    let book = bookCandidates.length > 0 ? bookCandidates[0].result : null;
    if (!book) {
      book = await this.bookAnalyzer.analyze(image, ocrContext);
    }

    return {
      fullText: raw.fullText,
      blocks: raw.blocks,
      detectedUnderlineRanges: highlights.ranges,
      pageNumber: raw.pageNumber,
      headerText: raw.headerText,
      highlights,
      pageNumberResult: {
        pageNumber: raw.pageNumber,
        confidence: raw.pageNumber !== null ? "high" : "low",
      },
      book,
      bookCandidates,
    };
  }

  private async extractOcr(image: ImageInput): Promise<RawOcr> {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (apiKey) {
      try {
        return await this.extractOcrGoogleVision(image, apiKey);
      } catch (err) {
        console.error("[OCR] Google Vision 실패, Claude fallback:", err);
      }
    }
    return this.extractOcrClaude(image);
  }

  // Google Vision DOCUMENT_TEXT_DETECTION — 책 페이지 텍스트에 특화
  private async extractOcrGoogleVision(image: ImageInput, apiKey: string): Promise<RawOcr> {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: image.base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["ko", "en"] },
          }],
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "(body 없음)");
      throw new Error(`Google Vision HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    const annotation = data.responses?.[0]?.fullTextAnnotation;
    if (!annotation) return { fullText: "", pageNumber: null, headerText: "", footerText: "", blocks: [] };

    const fullText: string = annotation.text ?? "";
    const page: GVPage = annotation.pages?.[0] ?? {};
    const pageW = page.width ?? 1;
    const pageH = page.height ?? 1;

    // 단락(paragraph) 단위로 TextBlock 생성 — 실제 바운딩박스 포함
    const blocks: TextBlock[] = [];
    for (const block of (page.blocks ?? []) as GVBlock[]) {
      for (const para of (block.paragraphs ?? []) as GVParagraph[]) {
        const text = (para.words ?? [])
          .map((w) => (w.symbols ?? []).map((s) => s.text ?? "").join(""))
          .join(" ")
          .trim();
        if (!text) continue;

        const verts = para.boundingBox?.vertices ?? [];
        const xs = verts.map((v) => v.x ?? 0);
        const ys = verts.map((v) => v.y ?? 0);
        const x = Math.min(...xs) / pageW;
        const y = Math.min(...ys) / pageH;
        const w = (Math.max(...xs) - Math.min(...xs)) / pageW;
        const h = (Math.max(...ys) - Math.min(...ys)) / pageH;

        blocks.push({ text, boundingBox: { x, y, width: w, height: h } });
      }
    }

    // 헤더(상위 8%) / 푸터(하위 8%) / 페이지 번호 추출
    const headerBlocks = blocks.filter((b) => b.boundingBox.y < 0.08);
    const footerBlocks = blocks.filter((b) => b.boundingBox.y + b.boundingBox.height > 0.92);
    const headerText = headerBlocks.map((b) => b.text).join(" ").trim();
    const footerText = footerBlocks.map((b) => b.text).join(" ").trim();

    // 페이지 번호: 헤더·푸터 영역에서 순수 숫자만 있는 단락
    const pageNumberRe = /^\d{1,4}$/;
    const pageNumberBlock = [...headerBlocks, ...footerBlocks].find((b) =>
      pageNumberRe.test(b.text.trim())
    );
    const pageNumber = pageNumberBlock?.text.trim() ?? null;

    console.log("[OCR] Google Vision 완료 — header:", JSON.stringify(headerText), "/ footer:", JSON.stringify(footerText), "/ pageNumber:", pageNumber);
    return { fullText, pageNumber, headerText, footerText, blocks };
  }

  // Claude fallback (Google Vision 키 없거나 실패 시)
  private async extractOcrClaude(image: ImageInput): Promise<RawOcr> {
    const PROMPT = `이 책 페이지를 정확하게 OCR하세요. JSON만 반환하고 다른 텍스트는 출력하지 마세요.

규칙:
- fullText: 인쇄된 본문 텍스트 전체를 원문 그대로. 줄바꿈은 \\n. 손글씨·낙서 제외
- headerText: 페이지 최상단의 작은 텍스트. 없으면 ""
- footerText: 페이지 최하단의 작은 텍스트 (페이지 번호 제외). 없으면 ""
- pageNumber: 페이지 번호 숫자만 문자열로. 없으면 null

{"fullText": "...", "pageNumber": "75", "headerText": "책 제목", "footerText": ""}`;

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match?.[0] ?? "{}") as Partial<RawOcr>;
      const fullText = parsed.fullText ?? "";
      const blocks = fullText
        .split(/\n+/)
        .filter((l) => l.trim())
        .map((l, i) => ({
          text: l.trim(),
          boundingBox: { x: 0.05, y: (i + 1) * 0.04, width: 0.9, height: 0.035 },
        }));
      return {
        fullText,
        pageNumber: parsed.pageNumber ?? null,
        headerText: parsed.headerText ?? "",
        footerText: parsed.footerText ?? "",
        blocks,
      };
    } catch {
      throw new Error("Claude OCR 응답 파싱 실패");
    }
  }
}
