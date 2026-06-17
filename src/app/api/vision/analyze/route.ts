import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Vision API key not configured" }, { status: 500 });
  }

  const { imageBase64 } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features: [
              { type: "DOCUMENT_TEXT_DETECTION" },
              { type: "IMAGE_PROPERTIES" },
            ],
          },
        ],
      }),
    }
  );

  if (!visionRes.ok) {
    const err = await visionRes.text();
    return NextResponse.json({ error: "Vision API error", detail: err }, { status: 502 });
  }

  const visionData = await visionRes.json();
  const response = visionData.responses?.[0];

  if (!response || response.error) {
    return NextResponse.json({ error: response?.error?.message ?? "No response" }, { status: 502 });
  }

  const fullText: string = response.textAnnotations?.[0]?.description ?? "";
  const fullAnnotation = response.fullTextAnnotation;

  // 텍스트 블록 추출
  const blocks: TextBlock[] = [];
  if (fullAnnotation?.pages) {
    for (const page of fullAnnotation.pages) {
      for (const block of page.blocks ?? []) {
        const blockText = (block.paragraphs ?? [])
          .flatMap((p: { words?: { symbols?: { text?: string }[] }[] }) =>
            (p.words ?? []).map((w: { symbols?: { text?: string }[] }) =>
              (w.symbols ?? []).map((s: { text?: string }) => s.text ?? "").join("")
            )
          )
          .join(" ");

        const verts = block.boundingBox?.vertices ?? [];
        if (verts.length === 4 && blockText.trim()) {
          const xs = verts.map((v: { x?: number }) => v.x ?? 0);
          const ys = verts.map((v: { y?: number }) => v.y ?? 0);
          blocks.push({
            text: blockText,
            boundingBox: {
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
            },
          });
        }
      }
    }
  }

  // 밑줄/형광펜 감지: 이미지 주요 색상에서 노란/형광 계열 탐지
  const dominantColors = response.imagePropertiesAnnotation?.dominantColors?.colors ?? [];
  const hasHighlight = dominantColors.some((c: {
    color: { red: number; green: number; blue: number };
    score: number;
  }) => {
    const { red, green, blue } = c.color ?? {};
    // 노란 형광: 높은 R+G, 낮은 B
    return red > 180 && green > 180 && blue < 100 && c.score > 0.05;
  });

  // 상단 헤더 텍스트 추출: 이미지 상위 20% 영역의 텍스트 (보통 책 제목/챕터명)
  const pageHeight = fullAnnotation?.pages?.[0]?.height ?? 1000;
  const headerBlocks = blocks
    .filter((b) => b.boundingBox.y < pageHeight * 0.2)
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  const headerText = headerBlocks.map((b) => b.text).join(" ").trim();

  // 페이지 번호 감지: 숫자만 있는 짧은 텍스트 블록 탐색
  const pageNumberPattern = /^\d{1,4}$/;
  let pageNumber: string | null = null;
  for (const block of blocks) {
    const trimmed = block.text.trim();
    if (pageNumberPattern.test(trimmed)) {
      pageNumber = trimmed;
      break;
    }
  }

  // 밑줄 범위 추정: 감지된 경우 첫 번째 문단을 기본 선택
  const detectedUnderlineRanges: { start: number; end: number }[] = [];
  if (hasHighlight && fullText.length > 0) {
    // 첫 번째 문단(첫 줄바꿈 전) 기본 선택
    const firstBreak = fullText.indexOf("\n\n");
    const end = firstBreak > 0 ? Math.min(firstBreak, 200) : Math.min(fullText.length, 200);
    detectedUnderlineRanges.push({ start: 0, end });
  }

  const result: AnalyzeResult = {
    fullText,
    blocks,
    detectedUnderlineRanges,
    pageNumber,
    headerText,
  };

  return NextResponse.json(result);
}
