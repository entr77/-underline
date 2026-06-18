"use client";

import { useRef, useState } from "react";

// 가로 밴드: 이미지 높이 기준 비율(0~1)
type Band = { yf: number; hf: number };
type Highlight = { id: number; band: Band; text: string; loading: boolean };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
};

async function extractBand(src: string, band: Band): Promise<string> {
  const base64 = await new Promise<string>((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const sy = band.yf * img.naturalHeight;
      const sh = Math.max(band.hf * img.naturalHeight, 20);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = Math.round(sh);
      canvas.getContext("2d")!.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, img.naturalWidth, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    img.src = src;
  });

  const res = await fetch("/api/vision/region", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ croppedImageBase64: base64 }),
  });
  const { text } = await res.json();
  return (text as string) ?? "";
}

let uid = 0;

export default function ImageHighlightPicker({ src, onTextExtracted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragBand, setDragBand] = useState<Band | null>(null);

  function relY(e: React.PointerEvent): number {
    const rect = containerRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min((e.clientY - rect.top) / rect.height, 1));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const y = relY(e);
    setDragStartY(y);
    setDragBand({ yf: y, hf: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY === null) return;
    const y = relY(e);
    setDragBand({
      yf: Math.min(dragStartY, y),
      hf: Math.abs(y - dragStartY),
    });
  }

  async function onPointerUp() {
    setDragStartY(null);
    const band = dragBand;
    setDragBand(null);
    if (!band) return;

    // 최소 높이 보장 (한 줄 이상)
    const finalBand: Band = { yf: band.yf, hf: Math.max(band.hf, 0.04) };

    const id = uid++;
    setHighlights((prev) => [...prev, { id, band: finalBand, text: "", loading: true }]);

    try {
      const text = await extractBand(src, finalBand);
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, text, loading: false } : h))
      );
      if (text) onTextExtracted(text);
    } catch {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    }
  }

  const anyLoading = highlights.some((h) => h.loading);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none cursor-ns-resize rounded-xl overflow-hidden border border-[var(--color-border)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDragStartY(null); setDragBand(null); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

      {/* 확정된 하이라이트 밴드 */}
      {highlights.map((h) => (
        <div
          key={h.id}
          className="absolute left-0 right-0"
          style={{ top: `${h.band.yf * 100}%`, height: `${Math.max(h.band.hf, 0.04) * 100}%` }}
        >
          <div
            className={`w-full h-full ${
              h.loading
                ? "bg-amber-300/40 animate-pulse"
                : "bg-amber-300/55 border-y-2 border-amber-400"
            }`}
          />
          {!h.loading && (
            <button
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 border border-amber-400 text-[10px] flex items-center justify-center shadow pointer-events-auto z-10"
              onClick={(e) => { e.stopPropagation(); setHighlights((p) => p.filter((x) => x.id !== h.id)); }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* 드래그 중 밴드 */}
      {dragBand && (
        <div
          className="absolute left-0 right-0 bg-amber-300/40 border-y-2 border-amber-400 pointer-events-none"
          style={{ top: `${dragBand.yf * 100}%`, height: `${Math.max(dragBand.hf, 0.02) * 100}%` }}
        />
      )}

      {/* 추출 중 */}
      {anyLoading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <span className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-sm">
            읽고 있어요...
          </span>
        </div>
      )}

      {/* 초기 힌트 */}
      {highlights.length === 0 && !dragBand && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-white/85 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
            밑줄 친 줄을 위아래로 쓸어서 선택하세요
          </span>
        </div>
      )}
    </div>
  );
}
