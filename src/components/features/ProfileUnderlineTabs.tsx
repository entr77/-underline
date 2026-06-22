"use client";

import { useState } from "react";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline } from "@/types";

type Tab = "all" | "public" | "private";

type Props = {
  underlines: Underline[];
  isOwnProfile: boolean;
};

export default function ProfileUnderlineTabs({ underlines, isOwnProfile }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const publicCount = underlines.filter((u) => u.is_public).length;
  const privateCount = underlines.filter((u) => !u.is_public).length;

  const filtered =
    tab === "public"
      ? underlines.filter((u) => u.is_public)
      : tab === "private"
      ? underlines.filter((u) => !u.is_public)
      : underlines;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `전체 ${underlines.length}` },
    { key: "public", label: `공개 ${publicCount}` },
    { key: "private", label: `비공개 ${privateCount}` },
  ];

  const emptyMessage =
    tab === "private"
      ? { main: "비공개 밑줄이 없어요", sub: null }
      : tab === "public"
      ? { main: "공개한 밑줄이 없어요", sub: null }
      : { main: "아직 아무도 멈추지 않았어요", sub: "당신이 멈춘 문장이 첫 번째가 될 수 있어요" };

  return (
    <div>
      {isOwnProfile && (
        <div className="flex gap-1.5 mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-[var(--color-forest)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-ink-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-[var(--color-border)]">
          <p className="text-[var(--color-ink-muted)]">{emptyMessage.main}</p>
          {emptyMessage.sub && (
            <p className="text-sm text-[var(--color-ink-faint)]">{emptyMessage.sub}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((u) => (
            <UnderlineCard key={u.id} underline={u} showVisibility={isOwnProfile} />
          ))}
        </div>
      )}
    </div>
  );
}
