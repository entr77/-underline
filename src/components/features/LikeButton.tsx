"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/app/actions/likes";

type Props = {
  underlineId: string;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "md";
};

export default function LikeButton({
  underlineId,
  initialLiked,
  initialCount,
  size = "sm",
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const newLiked = !liked;
    setLiked(newLiked);
    setCount((c) => c + (newLiked ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLike(underlineId);
      if (result?.error) {
        setLiked(!newLiked);
        setCount((c) => c + (newLiked ? -1 : 1));
      }
    });
  }

  const iconSize = size === "sm" ? "14" : "16";

  if (size === "md") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
          liked
            ? "bg-[var(--color-forest)] border-[var(--color-forest)] text-white"
            : "border-[var(--color-forest)] text-[var(--color-forest)] hover:bg-[var(--color-forest)] hover:text-white"
        }`}
      >
        <HeartIcon filled={liked} size={iconSize} />
        {count}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1 transition-colors ${
        liked
          ? "text-[var(--color-forest)]"
          : "text-[var(--color-ink-faint)] hover:text-[var(--color-forest)]"
      }`}
    >
      <HeartIcon filled={liked} size={iconSize} />
      <span className="text-xs">{count}</span>
    </button>
  );
}

function HeartIcon({ filled, size }: { filled: boolean; size: string }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
