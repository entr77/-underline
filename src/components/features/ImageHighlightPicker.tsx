"use client";

import { useRef, useState, useEffect } from "react";

type Box = { x: number; y: number; w: number; h: number };
type Highlight = { id: number; box: Box; loading: boolean };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
  onDone: () => void;
};

function mergeBox(a: Box | null, b: Box): Box {
  if (!a) return b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

async function cropToBase64(src: string, box: Box): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sw = Math.max(1, box.w * img.naturalWidth);
      const sh = Math.max(1, box.h * img.naturalHeight);
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      canvas.getContext("2d")!.drawImage(
        img,
        box.x * img.naturalWidth, box.y * img.naturalHeight, sw, sh,
        0, 0, sw, sh
      );
      resolve(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
    };
    img.src = src;
  });
}

let uid = 0;

export default function ImageHighlightPicker({ src, onTextExtracted, onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const strokeBounds = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const pendingBox = useRef<Box | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pendingDisplay, setPendingDisplay] = useState<Box | null>(null);
  const doneCount = highlights.filter((h) => !h.loading).length;

  // 캔버스를 이미지 컨테이너 크기에 동기화
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const sync = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; };
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
    const R = 22;
    ctx.globalAlpha = 0.5;
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
    const b = strokeBounds.current;
    if (!b) strokeBounds.current = { minX: x - R, minY: y - R, maxX: x + R, maxY: y + R };
    else {
      b.minX = Math.min(b.minX, x - R);
      b.minY = Math.min(b.minY, y - R);
      b.maxX = Math.max(b.maxX, x + R);
      b.maxY = Math.max(b.maxY, y + R);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    isDrawing.current = true;
    lastPos.current = null;
    strokeBounds.current = null;
    const { x, y } = relPos(e);
    paintAt(x, y);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing.current) return;
    const { x, y } = relPos(e);
    paintAt(x, y);
  }

  function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    const b = strokeBounds.current;
    strokeBounds.current = null;
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    if (!b || b.maxX - b.minX < 10) return;
    const W = canvas.width, H = canvas.height;
    const strokeBox: Box = {
      x: Math.max(0, b.minX) / W,
      y: Math.max(0, b.minY) / H,
      w: (Math.min(W, b.maxX) - Math.max(0, b.minX)) / W,
      h: (Math.min(H, b.maxY) - Math.max(0, b.minY)) / H,
    };
    pendingBox.current = mergeBox(pendingBox.current, strokeBox);
    setPendingDisplay(pendingBox.current);
    debounceRef.current = setTimeout(commit, 700);
  }

  async function commit() {
    debounceRef.current = null;
    const box = pendingBox.current;
    pendingBox.current = null;
    setPendingDisplay(null);
    if (!box) return;
    const id = uid++;
    setHighlights((prev) => [...prev, { id, box, loading: true }]);
    try {
      const base64 = await cropToBase64(src, box);
      const res = await fetch("/api/vision/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ croppedImageBase64: base64 }),
      });
      const { text } = (await res.json()) as { text?: string };
      setHighlights((prev) => prev.map((h) => h.id === id ? { ...h, loading: false } : h));
      if (text) onTextExtracted(text);
    } catch {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <span className="text-white/60 text-xs">밑줄 친 부분 위에 그어주세요</span>
        <button
          onClick={onDone}
          className="px-4 py-1.5 rounded-full bg-amber-400 text-black text-sm font-semibold"
        >
          완료{doneCount > 0 ? ` (${doneCount}개)` : ""}
        </button>
      </div>

      {/* 스크롤 가능한 이미지 영역 — 전체 너비 */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={containerRef}
          className="relative w-full select-none touch-none"
          style={{ cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='16' fill='%23FCD34D' fill-opacity='0.7' stroke='%23F59E0B' stroke-width='2'/%3E%3C/svg%3E\") 20 20, crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { isDrawing.current = false; lastPos.current = null; strokeBounds.current = null; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

          {/* 확정된 하이라이트 */}
          {highlights.map((h) => (
            <div
              key={h.id}
              className="absolute pointer-events-none"
              style={{
                left: `${h.box.x * 100}%`,
                top: `${h.box.y * 100}%`,
                width: `${h.box.w * 100}%`,
                height: `${h.box.h * 100}%`,
              }}
            >
              <div className={`w-full h-full rounded-sm ${h.loading ? "bg-amber-300/40 animate-pulse" : "bg-amber-400/55"}`} />
            </div>
          ))}

          {/* 그리는 중 미리보기 */}
          {pendingDisplay && (
            <div
              className="absolute pointer-events-none border-2 border-amber-400 bg-amber-300/25 rounded-sm"
              style={{
                left: `${pendingDisplay.x * 100}%`,
                top: `${pendingDisplay.y * 100}%`,
                width: `${pendingDisplay.w * 100}%`,
                height: `${pendingDisplay.h * 100}%`,
              }}
            />
          )}

          {/* 실시간 브러시 캔버스 */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          />

          {/* OCR 중 */}
          {highlights.some((h) => h.loading) && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50">
              <span className="bg-black/70 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-sm">
                읽고 있어요...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
