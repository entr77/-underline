"use client";

import { useState, useRef } from "react";
import UnderlineCard from "./UnderlineCard";
import type { Underline } from "@/types";

type Props = { underlines: Underline[] };

export default function UnderlineGroupCard({ underlines }: Props) {
  const [idx, setIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const swipedRef = useRef(false);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(underlines.length - 1, i + 1));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = e.clientX;
    draggingRef.current = true;
    setDragX(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragX(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (Math.abs(dragX) > 40) {
      swipedRef.current = true;
      if (dragX < 0) next();
      else prev();
      setTimeout(() => {
        swipedRef.current = false;
      }, 0);
    }
    setDragX(0);
    draggingRef.current = false;
  };

  return (
    <div>
      <div
        className="relative cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(e) => {
          if (swipedRef.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        style={{
          touchAction: "pan-y",
          transform: `translateX(${dragX * 0.08}px)`,
          transition: draggingRef.current ? "none" : "transform 0.2s ease-out",
        }}
      >
        <UnderlineCard key={underlines[idx].id} underline={underlines[idx]} />

        {underlines.length > 1 && (
          <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full pointer-events-none">
            {idx + 1} / {underlines.length}
          </div>
        )}
      </div>

      {underlines.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {underlines.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx
                  ? "bg-[var(--color-forest)] w-4"
                  : "bg-[var(--color-border)] w-1.5 hover:bg-[var(--color-ink-faint)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
