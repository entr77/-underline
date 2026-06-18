"use client";

import { useRef, useState, useEffect } from "react";

// 이미지 높이 대비 비율
type Band = { yf: number; hf: number };
type Highlight = { id: number; band: Band; loading: boolean };

type Props = {
  src: string;
  onTextExtracted: (text: string) => void;
  onDone: () => void;
};

// 캔버스에서 실제 칠해진 픽셀 행을 스캔 → 연속 행 묶음으로 반환
function getPaintedBands(canvas: HTMLCanvasElement): Band[] {
  const W = canvas.width;
  const H = canvas.height;
  if (!W || !H) return [];

  const ctx = canvas.getContext("2d")!;
  const data = ctx.getImageData(0, 0, W, H).data;

  // 각 행에 칠해진 픽셀(alpha>15)이 있는지 확인
  const painted = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    const rowOffset = y * W * 4;
    for (let x = 0; x < W; x++) {
      if (data[rowOffset + x * 4 + 3] > 15) {
        painted[y] = 1;
        break;
      }
    }
  }

  // 연속 칠해진 행을 묶음으로 — 4행 이하 틈은 허용 (브러시 획 사이 자연스러운 간격)
  const GAP = 5;
  const rawBands: Array<{ s: number; e: number }> = [];
  let start = -1;
  let gap = 0;

  for (let y = 0; y <= H; y++) {
    if (y < H && painted[y]) {
      if (start === -1) start = y;
      gap = 0;
    } else if (start !== -1) {
      gap++;
      if (gap > GAP || y === H) {
        rawBands.push({ s: start, e: y - gap - 1 });
        start = -1;
        gap = 0;
      }
    }
  }

  // 픽셀 좌표 → 이미지 비율 (위아래 4px 여유)
  return rawBands.map(({ s, e }) => {
    const top = Math.max(0, s - 4);
    const bot = Math.min(H, e + 4);
    return { yf: top / H, hf: (bot - top) / H };
  });
}

async function cropBandToBase64(src: string, band: Band): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const H = img.naturalHeight;
      const sy = Math.round(band.yf * H);
      const sh = Math.max(1, Math.round(band.hf * H));
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = sh;
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const doneCount = highlights.filter((h) => !h.loading).length;

  // 캔버스를 이미지 컨테이너 크기에 동기화
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
    const R = 10;
    ctx.globalAlpha = 0.55;
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
  }

  function scheduleCommit() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(commit, 700);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    // 새 획 시작 시 기존 debounce 취소 (획을 계속 이어 그릴 수 있음)
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    isDrawing.current = true;
    lastPos.current = null;
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
    scheduleCommit(); // 획 떼고 700ms 후 픽셀 스캔
  }

  async function commit() {
    debounceRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 실제 칠해진 픽셀 행을 스캔
    const bands = getPaintedBands(canvas);

    // 캔버스 초기화 (다음 선택을 위해)
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);

    if (!bands.length) return;

    // 각 밴드를 개별 OCR
    for (const band of bands) {
      if (band.hf < 0.003) continue;
      const id = uid++;
      setHighlights((prev) => [...prev, { id, band, loading: true }]);
      cropBandToBase64(src, band)
        .then((base64) =>
          fetch("/api/vision/region", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ croppedImageBase64: base64 }),
          })
        )
        .then((r) => r.json())
        .then(({ text }: { text?: string }) => {
          setHighlights((prev) =>
            prev.map((h) => (h.id === id ? { ...h, loading: false } : h))
          );
          if (text) onTextExtracted(text);
        })
        .catch(() => setHighlights((prev) => prev.filter((h) => h.id !== id)));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <span className="text-white/60 text-xs">밑줄 위에 칠하세요 — 획 여러 번 이어도 됩니다</span>
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
            scheduleCommit();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="책 페이지" className="w-full h-auto block" draggable={false} />

          {/* 확정 하이라이트 — 픽셀 스캔 기반 풀너비 띠 */}
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

          {/* 실시간 브러시 캔버스 — 획이 쌓임 (commit 전까지 유지) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          />

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
