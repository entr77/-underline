"use client";

import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import type { Underline } from "@/types";

type Props = {
  underline: Underline;
  compact?: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function UnderlineCard({ underline, compact }: Props) {
  return (
    <article className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      <Link href={`/underline/${underline.id}`} className="block">
        <div className="flex gap-3 mb-4">
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{underline.book.title}</p>
            <p className="text-xs text-[var(--color-ink-faint)] truncate">{underline.book.author}</p>
            {underline.page_number && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">p.{underline.page_number}</p>
            )}
          </div>
        </div>

        <blockquote className={`font-serif text-[var(--color-ink)] leading-relaxed mb-4 ${compact ? "text-base line-clamp-3" : "text-lg"}`}>
          "{underline.content}"
        </blockquote>
      </Link>

      <div className="flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-faint)]">
          <button className="flex items-center gap-1 hover:text-[var(--color-forest)] transition-colors">
            <HeartIcon filled={underline.is_liked} />
            <span>{underline.like_count}</span>
          </button>
          <span>{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1E3A2F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  );
}
