import { NextResponse } from "next/server";
import { VisionOrchestrator } from "@/lib/vision/orchestrator";
import { parseImageInput } from "@/lib/vision/types";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  const { imageBase64 } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  try {
    const orchestrator = new VisionOrchestrator();
    const result = await orchestrator.analyze(parseImageInput(imageBase64));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "이미지 분석 실패", detail: String(error) },
      { status: 502 }
    );
  }
}
