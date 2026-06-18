"use client";

import { useRef, useState, useEffect } from "react";

type Box = { x: number; y: number; w: number; h: number }; // 0~1 비율

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
};

function mergeBox(a: Box | null, b: Box): Box {
  if (!a) return b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
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

export default function ImageHighlightPicker({ src, onTextExtracted }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const strokeBounds = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const accBox = useRef<Box | null>(null); // 모든 획을 합친 누적 박스

  const [selectionBox, setSelectionBox] = useState<Box | null>(null); // 화면에 표시되는 단일 박스
  const [isLoading, setIsLoading] = useState(false);

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
    const R = 18;

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

    // 캔버스 지우기 (누적 박스 div가 표시를 대신함)
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);

    if (!b || b.maxX - b.minX < 10) return;

    const W = canvas.width;
    const H = canvas.height;
    const strokeBox: Box = {
      x: Math.max(0, b.minX) / W,
      y: Math.max(0, b.minY) / H,
      w: (Math.min(W, b.maxX) - Math.max(0, b.minX)) / W,
      h: (Math.min(H, b.maxY) - Math.max(0, b.minY)) / H,
    };

    // 기존 선택 영역과 합침
    accBox.current = mergeBox(accBox.current, strokeBox);
    setSelectionBox(accBox.current);
  }

  function clearSelection() {
    accBox.current = null;
    setSelectionBox(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function confirmExtract() {
    if (!selectionBox || isLoading) return;
    setIsLoading(true);
    try {
      const base64 = await cropToBase64(src, selectionBox);
      const res = await fetch("/api/vision/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ croppedImageBase64: base64 }),
      });
      const { text } = (await res.json()) as { text?: string };
      if (text) {
        onTextExtracted(text);
        clearSelection();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none rounded-xl overflow-hidden border border-[var(--color-border)]"
      style={{ cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='12' fill='%23FCD34D' fill-opacity='0.7' stroke='%23F59E0B' stroke-width='2'/%3E%3C/svg%3E\") 16 16, crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { isDrawing.current = false; lastPos.current = null; strokeBounds.current = null; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

      {/* 단일 누적 선택 영역 */}
      {selectionBox && (
        <div
          className="absolute"
          style={{
            left: `${selectionBox.x * 100}%`,
            top: `${selectionBox.y * 100}%`,
            width: `${selectionBox.w * 100}%`,
            height: `${selectionBox.h * 100}%`,
          }}
        >
          <div className="w-full h-full bg-amber-300/55 rounded-sm" />

          {/* 확인 / 취소 버튼 */}
          {!isLoading && (
            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                className="px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] shadow-md whitespace-nowrap"
              >
                취소
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); confirmExtract(); }}
                className="px-3 py-1.5 rounded-full bg-[var(--color-forest)] text-white text-xs font-medium shadow-md whitespace-nowrap"
              >
                이 문장 추출
              </button>
            </div>
          )}
          {isLoading && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="bg-black/60 text-white text-xs rounded-full px-3 py-1.5 backdrop-blur-sm whitespace-nowrap">
                읽고 있어요...
              </span>
            </div>
          )}
        </div>
      )}

      {/* 실시간 브러시 캔버스 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      {/* 초기 힌트 */}
      {!selectionBox && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-white/85 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
            밑줄 친 부분 위에 그어주세요
          </span>
        </div>
      )}
    </div>
  );
}
