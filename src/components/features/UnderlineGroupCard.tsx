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

export default function UnderlineGroupCard({ underlines }: Props) {
  const first = underlines[0];
  const { book, user, page_number } = first;

  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {/* 인용문 목록 */}
      <div className="px-6 pt-7 pb-5 space-y-4">
        <span className="block font-serif text-4xl leading-none text-[var(--color-forest)]/25 select-none">"</span>
        {underlines.map((u, i) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            {i > 0 && <div className="border-t border-[var(--color-border)] pt-4" />}
            <blockquote className="font-serif text-[1.2rem] text-[var(--color-ink)] leading-relaxed group-hover:text-[var(--color-ink-muted)] transition-colors">
              {u.content}
            </blockquote>
          </Link>
        ))}
      </div>

      {/* 책 정보 */}
      <div className="mx-4 mb-4 bg-white rounded-xl px-3 py-2.5 flex gap-3 items-center border border-[var(--color-border)]">
        <BookCover src={book.cover_url} title={book.title} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink)] truncate">{book.title}</p>
          <p className="text-xs text-[var(--color-ink-faint)] truncate">
            {book.author}
            {page_number ? ` · p.${page_number}` : ""}
          </p>
        </div>
      </div>

      {/* 하단 바 */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
