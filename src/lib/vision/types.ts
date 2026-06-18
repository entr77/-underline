export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ImageInput = {
  base64: string;
  mediaType: ImageMediaType;
};

export type TextBlock = {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
};

// OCR 결과 컨텍스트 — 이미지 분석 후 텍스트 기반 처리에 넘겨주는 데이터
export type OcrContext = {
  fullText: string;
  blocks: TextBlock[];
  headerText: string;
  footerText: string;
};

export type HighlightResult = {
  segments: string[];                          // 표시된 원문 조각들
  ranges: { start: number; end: number }[];   // fullText 내 위치
};

export type PageNumberResult = {
  pageNumber: string | null;
  confidence: "high" | "medium" | "low";
};

export type BookResult = {
  title: string;
  author: string;
  publisher: string;
  thumbnail: string;
  isbn: string;
  strategy: "header" | "footer" | "first-line" | "last-line" | "claude-text" | "claude-multi" | "gpt-multi" | "google-books" | "claude-image";
} | null;

// /api/vision/analyze 의 응답 타입
export type FullAnalysisResult = {
  // 기존 인터페이스 유지 (new/page.tsx 호환)
  fullText: string;
  blocks: TextBlock[];
  detectedUnderlineRanges: { start: number; end: number }[];
  pageNumber: string | null;
  headerText: string;
  // 확장 필드
  highlights: HighlightResult;
  pageNumberResult: PageNumberResult;
  book: BookResult;
};

// data URI 또는 순수 base64 문자열을 ImageInput으로 파싱
export function parseImageInput(imageBase64: string): ImageInput {
  const mimeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
  const mediaType = (mimeMatch?.[1] ?? "image/jpeg") as ImageMediaType;
  const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  return { base64, mediaType };
}
