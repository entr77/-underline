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
  highlightedTexts?: string[];
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
  "fullText": "인쇄된 책 본문 전체 텍스트 (줄바꿈은 \\n으로. 손글씨 메모는 제외)",
  "pageNumber": "페이지 번호 숫자 문자열 또는 null",
  "headerText": "페이지 상단 헤더 텍스트 (챕터명, 책 제목 등) 또는 빈 문자열",
  "highlightedTexts": ["독자가 표시한 텍스트 조각들의 배열. 없으면 빈 배열 []"]
}

highlightedTexts 감지 대상 — 아래 중 하나라도 해당하면 포함:
- 형광펜 (노랑·초록·주황·분홍·파랑 등 모든 색상)
- 볼펜·연필로 그은 직선 밑줄
- 물결 밑줄
- 동그라미·타원으로 감싼 텍스트
- 괄호·세로선으로 옆에 표시한 텍스트 블록

작성 규칙:
- 손글씨 메모나 낙서 자체는 포함하지 말고, 인쇄 텍스트에 표시된 것만 추출
- fullText에 등장하는 원문 그대로 배열 원소로 추가
- 표시 구간이 여러 곳이면 각각 별도 원소로 분리
- 한 표시가 여러 줄에 걸쳐 있으면 하나의 원소로 합쳐서 추가`,
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
  const highlightedTexts = Array.isArray(parsed.highlightedTexts) ? parsed.highlightedTexts : [];

  // Blocks: split fullText into paragraphs as virtual blocks (no bounding box from Claude)
  const blocks: TextBlock[] = fullText
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((line, i) => ({
      text: line.trim(),
      boundingBox: { x: 0, y: i * 40, width: 400, height: 36 },
    }));

  // Map each highlighted text segment to a {start, end} range in fullText
  const detectedUnderlineRanges: { start: number; end: number }[] = [];
  for (const segment of highlightedTexts) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const idx = fullText.indexOf(trimmed);
    if (idx >= 0) {
      detectedUnderlineRanges.push({ start: idx, end: idx + trimmed.length });
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
