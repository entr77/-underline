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
  const usePhoto = underline.card_style === "photo" && !!underline.image_url;

  if (usePhoto) {
    return (
      <article className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
        <Link href={`/underline/${underline.id}`} className="block">
          <div className="relative w-full aspect-[4/3] bg-[var(--color-cream-dark)]">
            <Image
              src={underline.image_url!}
              alt="밑줄 친 페이지"
              fill
              className="object-cover"
              sizes="(max-width: 430px) 100vw, 430px"
            />
          </div>
          <div className={`px-4 ${compact ? "pt-3 pb-2" : "pt-4 pb-3"}`}>
            <blockquote className={`font-serif text-[var(--color-ink)] leading-relaxed ${compact ? "text-sm" : "text-base"} line-clamp-3`}>
              &ldquo;{underline.content}&rdquo;
            </blockquote>
          </div>
          <div className="mx-4 mb-4 bg-[var(--color-cream)] rounded-xl px-3 py-2 flex gap-3 items-center border border-[var(--color-border)]">
            <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-[var(--color-ink)]">{underline.book.title}</p>
              <p className="text-xs truncate text-[var(--color-ink-faint)]">
                {underline.book.author}
                {underline.page_number ? ` · p.${underline.page_number}` : ""}
              </p>
            </div>
          </div>
        </Link>
        <div className="px-4 pb-4 flex items-center justify-between">
          <ProfileChip user={underline.user} size="sm" />
          <div className="flex items-center gap-3 text-xs">
            <LikeButton
              underlineId={underline.id}
              initialLiked={underline.is_liked ?? false}
              initialCount={underline.like_count}
              size="sm"
            />
            <span className="text-[var(--color-ink-faint)]">{timeAgo(underline.created_at)}</span>
          </div>
        </div>
      </article>
    );
  }

  // text layout — 인용문 히어로
  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      <Link href={`/underline/${underline.id}`} className="block">
        <div className={`px-6 ${compact ? "pt-5 pb-4" : "pt-7 pb-5"}`}>
          <span className="block font-serif text-4xl leading-none mb-1 select-none text-[var(--color-forest)]/25">"</span>
          <blockquote className={`font-serif leading-relaxed text-[var(--color-ink)] ${compact ? "text-base" : "text-[1.2rem]"}`}>
            {underline.content}
          </blockquote>
        </div>
        <div className="mx-4 mb-4 bg-white rounded-xl px-3 py-2.5 flex gap-3 items-center border border-[var(--color-border)]">
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-[var(--color-ink)]">{underline.book.title}</p>
            <p className="text-xs truncate text-[var(--color-ink-faint)]">
              {underline.book.author}
              {underline.page_number ? ` · p.${underline.page_number}` : ""}
            </p>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs">
          <LikeButton
            underlineId={underline.id}
            initialLiked={underline.is_liked ?? false}
            initialCount={underline.like_count}
            size="sm"
          />
          <span className="text-[var(--color-ink-faint)]">{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
