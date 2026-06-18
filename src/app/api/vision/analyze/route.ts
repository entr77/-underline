import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type TextBlock = {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
};

type AnalyzeResult = {
  fullText: string;
  blocks: TextBlock[];
  detectedUnderlineRanges: { start: number; end: number }[];
  pageNumber: string | null;
  headerText: string;
};

type ClaudeAnalysisJson = {
  fullText?: string;
  pageNumber?: string | null;
  headerText?: string;
  hasUnderline?: boolean;
  underlinedText?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  const { imageBase64 } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  // Detect MIME type from data URI prefix
  const mimeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          {
            type: "text",
            text: `이 책 페이지 이미지를 분석해주세요. JSON 형식으로만 답하고 다른 텍스트는 출력하지 마세요.

반환할 JSON 구조:
{
  "fullText": "페이지의 전체 텍스트 (줄바꿈은 \\n으로)",
  "pageNumber": "페이지 번호 숫자 문자열 또는 null",
  "headerText": "페이지 상단 헤더 텍스트 (챕터명, 책 제목 등) 또는 빈 문자열",
  "hasUnderline": true 또는 false,
  "underlinedText": "밑줄/형광펜으로 표시된 텍스트. 없으면 빈 문자열"
}`,
          },
        ],
      },
    ],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: ClaudeAnalysisJson;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? rawText);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Claude response", detail: rawText },
      { status: 502 }
    );
  }

  const fullText = parsed.fullText ?? "";
  const underlinedText = parsed.underlinedText ?? "";

  // Blocks: split fullText into paragraphs as virtual blocks (no bounding box from Claude)
  const blocks: TextBlock[] = fullText
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((line, i) => ({
      text: line.trim(),
      boundingBox: { x: 0, y: i * 40, width: 400, height: 36 },
    }));

  // Detect underline range in fullText
  const detectedUnderlineRanges: { start: number; end: number }[] = [];
  if (underlinedText.trim().length > 0) {
    const idx = fullText.indexOf(underlinedText.trim());
    if (idx >= 0) {
      detectedUnderlineRanges.push({ start: idx, end: idx + underlinedText.trim().length });
    } else if (fullText.length > 0) {
      // Fallback: first 200 chars
      detectedUnderlineRanges.push({ start: 0, end: Math.min(200, fullText.length) });
    }
  }

  const result: AnalyzeResult = {
    fullText,
    blocks,
    detectedUnderlineRanges,
    pageNumber: parsed.pageNumber ?? null,
    headerText: parsed.headerText ?? "",
  };

  return NextResponse.json(result);
}
