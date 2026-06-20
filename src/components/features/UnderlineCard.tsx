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

function quoteTextSize(len: number, compact: boolean): string {
  if (compact) return len < 60 ? "text-[0.9rem]" : "text-[0.82rem]";
  if (len < 40)  return "text-[1.15rem]";
  if (len < 80)  return "text-[1rem]";
  if (len < 130) return "text-[0.9rem]";
  if (len < 200) return "text-[0.85rem]";
  return "text-[0.8rem]";
}

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

  // 텍스트 레이아웃 — 다크 무드 인용구 카드
  return (
    <article className="relative bg-[var(--color-ink)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {/* 책 표지 블러 배경 */}
      {underline.book.cover_url && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${underline.book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px) saturate(0.4) brightness(0.35)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-[var(--color-ink)]/65" />

      {/* 인용문 */}
      <Link href={`/underline/${underline.id}`} className="relative block">
        <div className={`text-center ${compact ? "px-6 pt-8 pb-5" : "px-8 pt-10 pb-7"}`}>
          <blockquote className={`font-serif text-white/90 leading-[1.9] ${quoteTextSize(underline.content.length, compact ?? false)}`}>
            {underline.content}
          </blockquote>
          <p className="mt-5 text-white/40 text-[11px] tracking-wider">
            — {underline.book.title}
            {underline.book.author ? ` · ${underline.book.author}` : ""}
            {underline.page_number ? ` · p.${underline.page_number}` : ""}
          </p>
        </div>
      </Link>

      {/* 프로필 바 — 크림 스트립 */}
      <div className="relative px-4 py-3 bg-[#F7F3EE]/92 flex items-center justify-between">
        <ProfileChip user={underline.user} size="sm" />
        <div className="flex items-center gap-3 text-xs">
          <LikeButton underlineId={underline.id} initialLiked={underline.is_liked ?? false} initialCount={underline.like_count} size="sm" />
          <span className="text-[var(--color-ink-faint)]">{timeAgo(underline.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
