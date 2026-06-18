"use client";

import Link from "next/link";
import Image from "next/image";
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
  const { book, user, image_url, page_number } = first;

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {image_url && (
        <div className="relative w-full h-52 bg-[var(--color-cream-dark)]">
          <Image
            src={image_url}
            alt="책 페이지"
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-3 mb-4">
          <BookCover src={book.cover_url} title={book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{book.title}</p>
            <p className="text-xs text-[var(--color-ink-faint)] truncate">{book.author}</p>
            {page_number && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">p.{page_number}</p>
            )}
          </div>
        </div>

        <div className="space-y-0">
          {underlines.map((u, i) => (
            <Link key={u.id} href={`/underline/${u.id}`} className="block group">
              {i > 0 && (
                <div className="border-t border-[var(--color-border)] my-3" />
              )}
              <blockquote className="font-serif text-base text-[var(--color-ink)] leading-relaxed group-hover:text-[var(--color-ink-muted)] transition-colors">
                "{u.content}"
              </blockquote>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
