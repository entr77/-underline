"use client";

import { useRef, useState, useEffect } from "react";

// 모든 좌표는 이미지 비율(0~1) 기준
type Box = { x: number; y: number; w: number; h: number };
type Highlight = { id: number; box: Box; text: string; loading: boolean };

type Props = {
  src: string;
  initialHighlights?: (Box & { text: string })[];
  onTextExtracted: (text: string) => void;
};

async function cropToBase64(src: string, box: Box): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const sx = box.x * img.naturalWidth;
      const sy = box.y * img.naturalHeight;
      const sw = box.w * img.naturalWidth;
      const sh = box.h * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    img.src = src;
  });
}

async function extractText(src: string, box: Box): Promise<string> {
  const base64 = await cropToBase64(src, box);
  const res = await fetch("/api/vision/region", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ croppedImageBase64: base64 }),
  });
  const { text } = await res.json();
  return (text as string) ?? "";
}

let nextId = 0;

export default function ImageHighlightPicker({ src, initialHighlights = [], onTextExtracted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragBox, setDragBox] = useState<Box | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 초기 감지 하이라이트를 마운트 시 표시
  useEffect(() => {
    if (initialHighlights.length === 0) return;
    setHighlights(
      initialHighlights.map((h) => ({
        id: nextId++,
        box: { x: h.x, y: h.y, w: h.w, h: h.h },
        text: h.text,
        loading: false,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function relFrac(e: React.PointerEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)),
      y: Math.max(0, Math.min((e.clientY - rect.top) / rect.height, 1)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart(relFrac(e));
    setDragBox(null);
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart) return;
    const cur = relFrac(e);
    const x = Math.min(dragStart.x, cur.x);
    const y = Math.min(dragStart.y, cur.y);
    const w = Math.abs(cur.x - dragStart.x);
    const h = Math.abs(cur.y - dragStart.y);
    if (w > 0.03) setDragBox({ x, y, w, h });
  }

  async function onPointerUp(e: React.PointerEvent) {
    setIsDragging(false);
    setDragStart(null);
    const box = dragBox;
    setDragBox(null);
    if (!box || box.w < 0.05 || box.h < 0.01) return;

    const id = nextId++;
    setHighlights((prev) => [...prev, { id, box, text: "", loading: true }]);

    try {
      const text = await extractText(src, box);
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, text, loading: false } : h))
      );
      if (text) onTextExtracted(text);
    } catch {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    }

    void e; // suppress unused warning
  }

  function remove(id: number) {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }

  const anyLoading = highlights.some((h) => h.loading);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none cursor-crosshair rounded-xl overflow-hidden border border-[var(--color-border)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setIsDragging(false); setDragStart(null); setDragBox(null); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

      {/* 확정된 하이라이트 */}
      {highlights.map((h) => (
        <div
          key={h.id}
          className="absolute"
          style={{
            left: `${h.box.x * 100}%`,
            top: `${h.box.y * 100}%`,
            width: `${h.box.w * 100}%`,
            height: `${h.box.h * 100}%`,
          }}
        >
          <div
            className={`w-full h-full rounded-sm border-2 ${
              h.loading
                ? "bg-amber-200/40 border-amber-300 animate-pulse"
                : "bg-amber-300/50 border-amber-400"
            }`}
          />
          {!h.loading && (
            <button
              className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border border-[var(--color-border)] text-[10px] flex items-center justify-center shadow pointer-events-auto z-10"
              onClick={(e) => { e.stopPropagation(); remove(h.id); }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* 드래그 중 */}
      {dragBox && (
        <div
          className="absolute border-2 border-amber-400 bg-amber-300/30 rounded-sm pointer-events-none"
          style={{
            left: `${dragBox.x * 100}%`,
            top: `${dragBox.y * 100}%`,
            width: `${dragBox.w * 100}%`,
            height: `${dragBox.h * 100}%`,
          }}
        />
      )}

      {/* 추출 중 오버레이 */}
      {anyLoading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-sm">
            읽고 있어요...
          </span>
        </div>
      )}

      {/* 초기 힌트 */}
      {highlights.length === 0 && !dragBox && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-white/85 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
            밑줄 친 구간을 드래그해서 선택하세요
          </span>
        </div>
      )}
    </div>
  );
}
