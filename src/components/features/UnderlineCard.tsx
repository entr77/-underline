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

export default function UnderlineCard({ underline, compact }: Props) {
  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      <Link href={`/underline/${underline.id}`} className="block">
        {/* 인용문 히어로 */}
        <div className={`px-6 ${compact ? "pt-5 pb-4" : "pt-7 pb-5"}`}>
          <span className="block font-serif text-4xl leading-none text-[var(--color-forest)]/25 mb-1 select-none">"</span>
          <blockquote className={`font-serif text-[var(--color-ink)] leading-relaxed ${compact ? "text-base" : "text-[1.2rem]"}`}>
            {underline.content}
          </blockquote>
        </div>

        {/* 책 정보 */}
        <div className="mx-4 mb-4 bg-white rounded-xl px-3 py-2.5 flex gap-3 items-center border border-[var(--color-border)]">
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{underline.book.title}</p>
            <p className="text-xs text-[var(--color-ink-faint)] truncate">
              {underline.book.author}
              {underline.page_number ? ` · p.${underline.page_number}` : ""}
            </p>
          </div>
        </div>
      </Link>

      {/* 하단 바 */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-faint)]">
          <LikeButton
            underlineId={underline.id}
            initialLiked={underline.is_liked ?? false}
            initialCount={underline.like_count}
            size="sm"
          />
          <span>{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
