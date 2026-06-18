import { NextResponse } from "next/server";
import { HighlightAnalyzer } from "@/lib/vision/analyzers/highlight-analyzer";
import { getAnthropicClient } from "@/lib/vision/client";
import { parseImageInput } from "@/lib/vision/types";
import type { OcrContext } from "@/lib/vision/types";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  const { imageBase64, fullText, blocks } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  const context: OcrContext | undefined =
    fullText !== undefined
      ? { fullText, blocks: blocks ?? [], headerText: "", footerText: "" }
      : undefined;

  try {
    const analyzer = new HighlightAnalyzer(getAnthropicClient());
    const result = await analyzer.analyze(parseImageInput(imageBase64), context);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "밑줄 감지 실패", detail: String(error) },
      { status: 502 }
    );
  }
}
