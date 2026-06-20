"use client";

import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import type { Underline } from "@/types";

type Props = {
  underlines: Underline[];
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

const styleMap = {
  classic: {
    bg: "bg-[var(--color-cream)]",
    text: "text-[var(--color-ink)]",
    quote: "text-[var(--color-forest)]/25",
    divider: "border-[var(--color-border)]",
    bookBg: "bg-white",
    bookBorder: "border-[var(--color-border)]",
  },
  dark: {
    bg: "bg-[#1C1917]",
    text: "text-white",
    quote: "text-white/10",
    divider: "border-white/10",
    bookBg: "bg-white/10",
    bookBorder: "border-white/10",
  },
  forest: {
    bg: "bg-[var(--color-forest)]",
    text: "text-white",
    quote: "text-white/10",
    divider: "border-white/10",
    bookBg: "bg-white/10",
    bookBorder: "border-white/10",
  },
};

export default function UnderlineGroupCard({ underlines }: Props) {
  const first = underlines[0];
  const { book, user, page_number } = first;
  const style = styleMap[first.card_style ?? "classic"] ?? styleMap.classic;
  const isDark = first.card_style === "dark" || first.card_style === "forest";

  return (
    <article className={`${style.bg} rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors`}>
      {/* 인용문 목록 */}
      <div className="px-6 pt-7 pb-5 space-y-4">
        <span className={`block font-serif text-4xl leading-none select-none ${style.quote}`}>"</span>
        {underlines.map((u, i) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            {i > 0 && <div className={`border-t ${style.divider} pt-4`} />}
            <blockquote className={`font-serif text-[1.2rem] leading-relaxed transition-colors ${style.text} ${isDark ? "group-hover:opacity-80" : "group-hover:text-[var(--color-ink-muted)]"}`}>
              {u.content}
            </blockquote>
          </Link>
        ))}
      </div>

      {/* 책 정보 */}
      <div className={`mx-4 mb-4 ${style.bookBg} rounded-xl px-3 py-2.5 flex gap-3 items-center border ${style.bookBorder}`}>
        <BookCover src={book.cover_url} title={book.title} size="sm" />
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${style.text}`}>{book.title}</p>
          <p className={`text-xs truncate ${isDark ? "text-white/50" : "text-[var(--color-ink-faint)]"}`}>
            {book.author}
            {page_number ? ` · p.${page_number}` : ""}
          </p>
        </div>
      </div>

      {/* 하단 바 */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className={`text-xs ${isDark ? "text-white/50" : "text-[var(--color-ink-faint)]"}`}>{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
