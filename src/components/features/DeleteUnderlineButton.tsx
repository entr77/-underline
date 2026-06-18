"use client";

import { useState, useTransition } from "react";
import { deleteUnderline } from "@/app/actions/underline";

type Props = {
  underlineId: string;
};

export default function DeleteUnderlineButton({ underlineId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-ink-faint)]">삭제할까요?</span>
        <button
          onClick={() => {
            startTransition(async () => {
              await deleteUnderline(underlineId);
            });
          }}
          disabled={isPending}
          className="text-xs text-red-500 font-medium hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {isPending ? "삭제 중..." : "삭제"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
        >
          취소
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-2 rounded-full text-[var(--color-ink-faint)] hover:text-red-400 hover:bg-red-50 transition-colors"
      aria-label="밑줄 삭제"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}
