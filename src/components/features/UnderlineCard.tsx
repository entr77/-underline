"use client";

import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import LikeButton from "@/components/features/LikeButton";
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

const styleMap = {
  classic: {
    bg: "bg-[var(--color-cream)]",
    text: "text-[var(--color-ink)]",
    quote: "text-[var(--color-forest)]/25",
    bookBg: "bg-white",
    bookBorder: "border-[var(--color-border)]",
  },
  dark: {
    bg: "bg-[#1C1917]",
    text: "text-white",
    quote: "text-white/10",
    bookBg: "bg-white/10",
    bookBorder: "border-white/10",
  },
  forest: {
    bg: "bg-[var(--color-forest)]",
    text: "text-white",
    quote: "text-white/10",
    bookBg: "bg-white/10",
    bookBorder: "border-white/10",
  },
};

export default function UnderlineCard({ underline, compact }: Props) {
  const style = styleMap[underline.card_style ?? "classic"] ?? styleMap.classic;
  const isDark = underline.card_style === "dark" || underline.card_style === "forest";

  return (
    <article className={`${style.bg} rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors`}>
      <Link href={`/underline/${underline.id}`} className="block">
        {/* 인용문 히어로 */}
        <div className={`px-6 ${compact ? "pt-5 pb-4" : "pt-7 pb-5"}`}>
          <span className={`block font-serif text-4xl leading-none mb-1 select-none ${style.quote}`}>"</span>
          <blockquote className={`font-serif leading-relaxed ${style.text} ${compact ? "text-base" : "text-[1.2rem]"}`}>
            {underline.content}
          </blockquote>
        </div>

        {/* 책 정보 */}
        <div className={`mx-4 mb-4 ${style.bookBg} rounded-xl px-3 py-2.5 flex gap-3 items-center border ${style.bookBorder}`}>
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${style.text}`}>{underline.book.title}</p>
            <p className={`text-xs truncate ${isDark ? "text-white/50" : "text-[var(--color-ink-faint)]"}`}>
              {underline.book.author}
              {underline.page_number ? ` · p.${underline.page_number}` : ""}
            </p>
          </div>
        </div>
      </Link>

      {/* 하단 바 */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs">
          <LikeButton
            underlineId={underline.id}
            initialLiked={underline.is_liked ?? false}
            initialCount={underline.like_count}
            size="sm"
          />
          <span className={isDark ? "text-white/50" : "text-[var(--color-ink-faint)]"}>{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
