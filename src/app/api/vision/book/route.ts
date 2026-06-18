import { NextResponse } from "next/server";
import { BookAnalyzer } from "@/lib/vision/analyzers/book-analyzer";
import { getAnthropicClient } from "@/lib/vision/client";
import { parseImageInput } from "@/lib/vision/types";
import type { OcrContext } from "@/lib/vision/types";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  const { imageBase64, fullText, blocks, headerText, footerText } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  const context: OcrContext | undefined =
    fullText !== undefined
      ? {
          fullText,
          blocks: blocks ?? [],
          headerText: headerText ?? "",
          footerText: footerText ?? "",
        }
      : undefined;

  try {
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY ?? "";
    const analyzer = new BookAnalyzer(getAnthropicClient(), kakaoApiKey);
    const result = await analyzer.analyze(parseImageInput(imageBase64), context);
    return NextResponse.json({ book: result });
  } catch (error) {
    return NextResponse.json(
      { error: "책 식별 실패", detail: String(error) },
      { status: 502 }
    );
  }
}
