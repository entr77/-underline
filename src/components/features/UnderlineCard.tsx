"use client";

import Link from "next/link";
import Image from "next/image";
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
    <article className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      <Link href={`/underline/${underline.id}`} className="block">
        <div className="flex gap-3 mb-4">
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{underline.book.title}</p>
            <p className="text-xs text-[var(--color-ink-faint)] truncate">{underline.book.author}</p>
            {underline.page_number && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">p.{underline.page_number}</p>
            )}
          </div>
        </div>

        {underline.image_url ? (
          <div className="relative w-full h-64 rounded-xl overflow-hidden mb-3 bg-[var(--color-cream-dark)]">
            <Image
              src={underline.image_url}
              alt="책 페이지"
              fill
              className="object-cover"
              sizes="(max-width: 430px) 100vw, 430px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <blockquote className={`absolute bottom-0 left-0 right-0 p-4 font-serif text-white leading-relaxed ${compact ? "text-sm line-clamp-3" : "text-base line-clamp-4"}`}>
              "{underline.content}"
            </blockquote>
          </div>
        ) : (
          <blockquote className={`font-serif text-[var(--color-ink)] leading-relaxed mb-4 ${compact ? "text-base line-clamp-3" : "text-lg"}`}>
            "{underline.content}"
          </blockquote>
        )}
      </Link>

      <div className="flex items-center justify-between">
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
