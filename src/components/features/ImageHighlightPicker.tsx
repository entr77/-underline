"use client";

import { useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };
type Highlight = { id: number; rect: Rect; text: string };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
};

async function cropToBase64(src: string, rect: Rect, displayW: number, displayH: number): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const sx = (rect.x / displayW) * img.naturalWidth;
      const sy = (rect.y / displayH) * img.naturalHeight;
      const sw = (rect.w / displayW) * img.naturalWidth;
      const sh = (rect.h / displayH) * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    img.src = src;
  });
}

export default function ImageHighlightPicker({ src, onTextExtracted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingRect, setPendingRect] = useState<Rect | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  function relPos(e: React.PointerEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setPendingRect(null);
    setDragRect(null);
    setDragStart(relPos(e));
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart) return;
    const cur = relPos(e);
    const x = Math.min(dragStart.x, cur.x);
    const y = Math.min(dragStart.y, cur.y);
    const w = Math.abs(cur.x - dragStart.x);
    const h = Math.abs(cur.y - dragStart.y);
    if (w > 8) setDragRect({ x, y, w, h });
  }

  function onPointerUp() {
    setIsDragging(false);
    setDragStart(null);
    if (dragRect && dragRect.w > 20 && dragRect.h > 8) {
      setPendingRect(dragRect);
    }
    setDragRect(null);
  }

  async function confirmExtract() {
    if (!pendingRect || !containerRef.current) return;
    setIsExtracting(true);
    try {
      const base64 = await cropToBase64(
        src,
        pendingRect,
        containerRef.current.offsetWidth,
        containerRef.current.offsetHeight
      );
      const res = await fetch("/api/vision/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ croppedImageBase64: base64 }),
      });
      const { text } = await res.json();
      if (text) {
        const id = idRef.current++;
        setHighlights((prev) => [...prev, { id, rect: pendingRect, text }]);
        onTextExtracted(text);
      }
    } finally {
      setIsExtracting(false);
      setPendingRect(null);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none cursor-crosshair rounded-xl overflow-hidden border border-[var(--color-border)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

      {/* 확정된 하이라이트 */}
      {highlights.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none"
          style={{ left: h.rect.x, top: h.rect.y, width: h.rect.w, height: h.rect.h }}
        >
          <div className="w-full h-full bg-amber-300/50 border-2 border-amber-400 rounded-sm" />
        </div>
      ))}

      {/* 드래그 중 */}
      {dragRect && (
        <div
          className="absolute border-2 border-amber-400 bg-amber-300/30 rounded-sm pointer-events-none"
          style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }}
        />
      )}

      {/* 확인 대기 */}
      {pendingRect && !isExtracting && (
        <div
          className="absolute border-2 border-amber-400 bg-amber-300/30 rounded-sm"
          style={{ left: pendingRect.x, top: pendingRect.y, width: pendingRect.w, height: pendingRect.h }}
        >
          <button
            className="absolute left-1/2 -translate-x-1/2 -bottom-9 whitespace-nowrap px-3 py-1.5 rounded-full bg-[var(--color-forest)] text-white text-xs font-medium shadow-lg z-10"
            onClick={(e) => { e.stopPropagation(); confirmExtract(); }}
          >
            이 문장 추출하기
          </button>
        </div>
      )}

      {/* 추출 중 */}
      {isExtracting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
          <span className="bg-white rounded-full px-4 py-2 text-sm text-[var(--color-ink)] shadow-lg">
            읽고 있어요...
          </span>
        </div>
      )}

      {/* 초기 힌트 */}
      {highlights.length === 0 && !pendingRect && !isExtracting && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-white/85 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
            밑줄 친 구간을 드래그해서 선택하세요
          </span>
        </div>
      )}
    </div>
  );
}
