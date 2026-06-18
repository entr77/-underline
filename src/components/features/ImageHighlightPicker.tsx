"use client";

import { useRef, useState, useEffect } from "react";

type Box = { x: number; y: number; w: number; h: number }; // 0~1 비율
type Highlight = { id: number; box: Box; text: string; loading: boolean };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
};

let uid = 0;

export default function ImageHighlightPicker({ src, onTextExtracted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // 현재 획의 bounding box (픽셀)
  const strokeBounds = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const anyLoading = highlights.some((h) => h.loading);

  // 캔버스 크기를 컨테이너와 동기화
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const sync = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function relPos(e: React.PointerEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function paintAt(x: number, y: number) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const R = 18; // 브러시 반지름

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#FCD34D";
    ctx.strokeStyle = "#FCD34D";
    ctx.lineWidth = R * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();

    lastPos.current = { x, y };

    // 획 영역 누적
    const b = strokeBounds.current;
    if (!b) {
      strokeBounds.current = { minX: x - R, minY: y - R, maxX: x + R, maxY: y + R };
    } else {
      b.minX = Math.min(b.minX, x - R);
      b.minY = Math.min(b.minY, y - R);
      b.maxX = Math.max(b.maxX, x + R);
      b.maxY = Math.max(b.maxY, y + R);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPos.current = null;
    strokeBounds.current = null;
    paintAt(...Object.values(relPos(e)) as [number, number]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing.current) return;
    paintAt(...Object.values(relPos(e)) as [number, number]);
  }

  async function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;

    const b = strokeBounds.current;
    strokeBounds.current = null;

    // 캔버스 획 지우기 (div overlay로 대체됨)
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!b || b.maxX - b.minX < 10) return;

    const W = canvas.width;
    const H = canvas.height;
    const box: Box = {
      x: Math.max(0, b.minX) / W,
      y: Math.max(0, b.minY) / H,
      w: (Math.min(W, b.maxX) - Math.max(0, b.minX)) / W,
      h: (Math.min(H, b.maxY) - Math.max(0, b.minY)) / H,
    };

    const id = uid++;
    setHighlights((prev) => [...prev, { id, box, text: "", loading: true }]);

    try {
      const base64 = await cropToBase64(src, box);
      const res = await fetch("/api/vision/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ croppedImageBase64: base64 }),
      });
      const { text } = (await res.json()) as { text?: string };
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, text: text ?? "", loading: false } : h))
      );
      if (text) onTextExtracted(text);
    } catch {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    }
  }

  function cancelDraw() {
    isDrawing.current = false;
    lastPos.current = null;
    strokeBounds.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none rounded-xl overflow-hidden border border-[var(--color-border)]"
      style={{ cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='%23FCD34D' fill-opacity='0.7' stroke='%23F59E0B' stroke-width='2'/%3E%3C/svg%3E\") 16 16, crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelDraw}
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
            className={`w-full h-full rounded ${
              h.loading ? "bg-amber-300/40 animate-pulse" : "bg-amber-300/60"
            }`}
          />
          {!h.loading && (
            <button
              className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border border-amber-400 text-[10px] flex items-center justify-center shadow pointer-events-auto z-10"
              onClick={(e) => {
                e.stopPropagation();
                setHighlights((p) => p.filter((x) => x.id !== h.id));
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* 실시간 브러시 획 캔버스 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      {/* 추출 중 */}
      {anyLoading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <span className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-sm">
            읽고 있어요...
          </span>
        </div>
      )}

      {/* 초기 힌트 */}
      {highlights.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-white/85 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
            밑줄 친 부분 위에 그어주세요
          </span>
        </div>
      )}
    </div>
  );
}

async function cropToBase64(src: string, box: Box): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const sx = box.x * img.naturalWidth;
      const sy = box.y * img.naturalHeight;
      const sw = Math.max(1, box.w * img.naturalWidth);
      const sh = Math.max(1, box.h * img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    img.src = src;
  });
}
