import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/vision/client";

export async function POST(request: Request) {
  const { croppedImageBase64 } = await request.json();
  if (!croppedImageBase64) {
    return NextResponse.json({ error: "croppedImageBase64 required" }, { status: 400 });
  }

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: croppedImageBase64 },
            },
            {
              type: "text",
              text: "이 이미지에 인쇄된 텍스트를 그대로 추출하세요. 텍스트만 반환하고 다른 말은 쓰지 마세요.",
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: "텍스트 추출 실패", detail: String(error) }, { status: 502 });
  }
}
