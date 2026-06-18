"use client";

import { useRef, useState, useEffect } from "react";

// Y 범위만 사용 — 책 텍스트는 항상 가로로 풀 너비이므로 X bounding box 불필요
type Band = { yf: number; hf: number }; // 이미지 높이 대비 비율
type Highlight = { id: number; band: Band; loading: boolean };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
  onDone: () => void;
};

function mergeBands(a: Band, b: Band): Band {
  const top = Math.min(a.yf, b.yf);
  const bottom = Math.max(a.yf + a.hf, b.yf + b.hf);
  return { yf: top, hf: bottom - top };
}

async function cropBandToBase64(src: string, band: Band): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const H = img.naturalHeight;
      const sy = Math.max(0, Math.round(band.yf * H) - 6);
      const sh = Math.min(H - sy, Math.round(band.hf * H) + 12);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = Math.max(1, sh);
      canvas.getContext("2d")!.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, img.naturalWidth, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.93).split(",")[1]);
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
  const strokeY = useRef<{ minY: number; maxY: number } | null>(null);
  const pendingBand = useRef<Band | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [liveBand, setLiveBand] = useState<Band | null>(null);
  const doneCount = highlights.filter((h) => !h.loading).length;

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
    const R = 10; // 얇은 브러시 — 세밀한 선택 가능
    ctx.globalAlpha = 0.6;
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

    // X는 무시, Y 범위만 추적
    const b = strokeY.current;
    if (!b) strokeY.current = { minY: y - R, maxY: y + R };
    else {
      b.minY = Math.min(b.minY, y - R);
      b.maxY = Math.max(b.maxY, y + R);
    }
    const H = canvas.height;
    if (H > 0 && strokeY.current) {
      const yf = Math.max(0, strokeY.current.minY / H);
      const hf = Math.min(1 - yf, (strokeY.current.maxY - strokeY.current.minY) / H);
      setLiveBand({ yf, hf });
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    isDrawing.current = true;
    lastPos.current = null;
    strokeY.current = null;
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

    const sy = strokeY.current;
    strokeY.current = null;
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setLiveBand(null);

    if (!sy) return;
    const H = canvas.height;
    const newBand: Band = {
      yf: Math.max(0, sy.minY / H),
      hf: Math.min(1, (sy.maxY - sy.minY) / H),
    };
    pendingBand.current = pendingBand.current
      ? mergeBands(pendingBand.current, newBand)
      : newBand;

    debounceRef.current = setTimeout(commit, 700);
  }

  async function commit() {
    debounceRef.current = null;
    const band = pendingBand.current;
    pendingBand.current = null;
    if (!band || band.hf < 0.005) return;

    const id = uid++;
    setHighlights((prev) => [...prev, { id, band, loading: true }]);
    try {
      const base64 = await cropBandToBase64(src, band);
      const res = await fetch("/api/vision/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ croppedImageBase64: base64 }),
      });
      const { text } = (await res.json()) as { text?: string };
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, loading: false } : h))
      );
      if (text) onTextExtracted(text);
    } catch {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <span className="text-white/60 text-xs">밑줄 위를 가로질러 긁어주세요</span>
        <button
          onClick={onDone}
          className="px-4 py-1.5 rounded-full bg-amber-400 text-black text-sm font-semibold"
        >
          완료{doneCount > 0 ? ` (${doneCount}개)` : ""}
        </button>
      </div>

      {/* 스크롤 가능한 이미지 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={containerRef}
          className="relative w-full select-none touch-none"
          style={{ cursor: "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            isDrawing.current = false;
            lastPos.current = null;
            strokeY.current = null;
            setLiveBand(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

          {/* 확정 하이라이트 — 풀 너비 띠 */}
          {highlights.map((h) => (
            <div
              key={h.id}
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: `${h.band.yf * 100}%`, height: `${h.band.hf * 100}%` }}
            >
              <div
                className={`w-full h-full ${
                  h.loading ? "bg-amber-300/40 animate-pulse" : "bg-amber-400/55"
                }`}
              />
            </div>
          ))}

          {/* 현재 획의 Y 범위 미리보기 — 크롭될 영역 표시 */}
          {liveBand && (
            <div
              className="absolute left-0 right-0 pointer-events-none border-t-2 border-b-2 border-amber-400/80"
              style={{
                top: `${liveBand.yf * 100}%`,
                height: `${liveBand.hf * 100}%`,
                background: "rgba(252, 211, 77, 0.12)",
              }}
            />
          )}

          {/* 실시간 브러시 캔버스 */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          />

          {/* OCR 진행 중 */}
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
