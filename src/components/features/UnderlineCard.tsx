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
          <div className="px-4 pb-4 flex items-center gap-2.5">
            <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate text-[var(--color-ink)]">{underline.book.title}</p>
              <p className="text-[11px] truncate text-[var(--color-ink-faint)]">
                {underline.book.author}{underline.page_number ? ` · p.${underline.page_number}` : ""}
              </p>
            </div>
          </div>
        </Link>
        <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <ProfileChip user={underline.user} size="sm" />
          <div className="flex items-center gap-3 text-xs">
            <LikeButton underlineId={underline.id} initialLiked={underline.is_liked ?? false} initialCount={underline.like_count} size="sm" />
            <span className="text-[var(--color-ink-faint)]">{timeAgo(underline.created_at)}</span>
          </div>
        </div>
      </article>
    );
  }

  // 텍스트 레이아웃 — 중앙 정렬 인용문 카드
  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      <Link href={`/underline/${underline.id}`} className="block">
        {/* 인용문 — 중앙 정렬 */}
        <div className={`text-center ${compact ? "px-6 pt-7 pb-5" : "px-7 pt-9 pb-7"}`}>
          <p className="font-serif text-[32px] leading-none text-[var(--color-forest)] opacity-20 mb-4 select-none">&ldquo;</p>
          <blockquote className={`font-serif leading-[1.9] text-[var(--color-ink)] ${compact ? "text-[1rem]" : "text-[1.15rem]"}`}>
            {underline.content}
          </blockquote>
        </div>
        {/* 책 정보 — 구분선 + 인라인 */}
        <div className="px-6 pb-5">
          <div className="border-t border-[var(--color-border)] mb-4" />
          <div className="flex items-center gap-3">
            <BookCover src={underline.book.cover_url} title={underline.book.title} size="sm" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate text-[var(--color-ink)]">{underline.book.title}</p>
              <p className="text-[11px] truncate text-[var(--color-ink-faint)]">
                {underline.book.author}{underline.page_number ? ` · p.${underline.page_number}` : ""}
              </p>
            </div>
          </div>
        </div>
      </Link>
      <div className="px-5 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs">
          <LikeButton underlineId={underline.id} initialLiked={underline.is_liked ?? false} initialCount={underline.like_count} size="sm" />
          <span className="text-[var(--color-ink-faint)]">{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
