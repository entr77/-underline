"use client";

import { useRef, useState } from "react";

type CropRect = { x: number; y: number; w: number; h: number };
type Props = { src: string; onConfirm: (file: File) => void; onCancel: () => void };

async function buildRotatedSrc(originalSrc: string, deg: number): Promise<string> {
  if (deg === 0) return originalSrc;
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const swap = deg === 90 || deg === 270;
      const cw = swap ? img.naturalHeight : img.naturalWidth;
      const ch = swap ? img.naturalWidth : img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = originalSrc;
  });
}

async function applyCrop(
  displaySrc: string,
  rect: CropRect,
  displayW: number,
  displayH: number
): Promise<string> {
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
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = displaySrc;
  });
}

export default function ImageCropRotate({ src, onConfirm, onCancel }: Props) {
  const [rotation, setRotation] = useState(0);
  const [displaySrc, setDisplaySrc] = useState(src);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function handleRotate(dir: "cw" | "ccw") {
    const newDeg = (rotation + (dir === "cw" ? 90 : 270)) % 360;
    const newSrc = await buildRotatedSrc(src, newDeg);
    setRotation(newDeg);
    setDisplaySrc(newSrc);
    setCropRect(null);
  }

  function relPos(e: React.PointerEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart(relPos(e));
    setCropRect(null);
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart) return;
    const cur = relPos(e);
    const x = Math.min(dragStart.x, cur.x);
    const y = Math.min(dragStart.y, cur.y);
    const w = Math.abs(cur.x - dragStart.x);
    const h = Math.abs(cur.y - dragStart.y);
    if (w > 10 && h > 10) setCropRect({ x, y, w, h });
  }

  function onPointerUp() {
    setIsDragging(false);
    setDragStart(null);
  }

  async function handleConfirm() {
    setIsProcessing(true);
    try {
      let finalSrc = displaySrc;
      if (cropRect && containerRef.current) {
        finalSrc = await applyCrop(
          displaySrc,
          cropRect,
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight
        );
      }
      const blob = await fetch(finalSrc).then((r) => r.blob());
      onConfirm(new File([blob], "image.jpg", { type: "image/jpeg" }));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-xl text-[var(--color-ink)]">사진 조정</h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
          사진이 기울었으면 회전하고, 밑줄 부분만 드래그해서 선택하세요
        </p>
      </div>

      {/* 이미지 + 크롭 오버레이 */}
      <div
        ref={containerRef}
        className="relative w-full select-none touch-none cursor-crosshair rounded-xl overflow-hidden border border-[var(--color-border)] bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt="편집 이미지"
          className="w-full h-auto block"
          draggable={false}
        />
        {cropRect ? (
          <div
            className="absolute border-2 border-white pointer-events-none"
            style={{
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.w,
              height: cropRect.h,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
            <span className="text-white/80 text-xs bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
              드래그해서 밑줄 영역만 선택할 수 있어요
            </span>
          </div>
        )}
      </div>

      {/* 회전 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleRotate("ccw")}
          className="flex-1 h-11 rounded-2xl bg-[var(--color-cream-dark)] flex items-center justify-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-border)] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          왼쪽 회전
        </button>
        <button
          onClick={() => handleRotate("cw")}
          className="flex-1 h-11 rounded-2xl bg-[var(--color-cream-dark)] flex items-center justify-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-border)] transition-colors"
        >
          오른쪽 회전
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {cropRect && (
          <button
            onClick={() => setCropRect(null)}
            className="px-4 py-3 rounded-2xl border border-[var(--color-border)] text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] transition-colors"
          >
            선택 취소
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-50 transition-colors"
        >
          {isProcessing ? "처리 중..." : cropRect ? "선택 영역 분석하기" : "전체 분석하기"}
        </button>
      </div>

      <button
        onClick={onCancel}
        className="text-center text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors py-1"
      >
        처음으로 돌아가기
      </button>
    </div>
  );
}
