"use client";

import Link from "next/link";
import Image from "next/image";
import LikeButton from "@/components/features/LikeButton";
import type { Underline } from "@/types";

type Props = {
  underline: Underline;
  compact?: boolean;
};

function quoteTextSize(len: number, compact: boolean): string {
  if (compact) return "text-[11px]";
  if (len < 60)  return "text-[0.95rem]";
  if (len < 120) return "text-sm";
  if (len < 200) return "text-[13px]";
  return "text-xs";
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

function Avatar({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80 text-[10px] font-medium flex-shrink-0">
        {username[0].toUpperCase()}
      </div>
      <span className="text-white/60 text-[11px]">{username}</span>
    </div>
  );
}

export default function UnderlineCard({ underline, compact }: Props) {
  const usePhoto = underline.card_style === "photo" && !!underline.image_url;

  if (usePhoto) {
    // 사진 카드 — 정사각형 풀블리드 + 하단 오버레이
    return (
      <article className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
        <Image
          src={underline.image_url!}
          alt="밑줄 친 페이지"
          fill
          className="object-cover"
          sizes="(max-width: 430px) 100vw, 430px"
        />
        {/* 하단 그라디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        {/* 인용문 + 책 제목 */}
        <Link
          href={`/underline/${underline.id}`}
          className="absolute inset-x-0 bottom-11 top-0 flex flex-col justify-end px-4 pb-3"
        >
          <blockquote
            className={`font-serif text-white leading-[1.7] ${compact ? "text-[11px] line-clamp-3" : "text-sm line-clamp-4"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
          >
            &ldquo;{underline.content}&rdquo;
          </blockquote>
          <p className="text-white/50 text-[10px] mt-1.5 truncate">
            {underline.book.title}
            {underline.page_number ? ` · p.${underline.page_number}` : ""}
          </p>
        </Link>

        {/* 하단 바 — 프로필 + 좋아요 */}
        <div className="absolute bottom-0 inset-x-0 h-11 px-4 flex items-center justify-between">
          <Avatar username={underline.user.username} />
          <LikeButton
            underlineId={underline.id}
            initialLiked={underline.is_liked ?? false}
            initialCount={underline.like_count}
            size="sm"
          />
        </div>
      </article>
    );
  }

  // 텍스트 카드 — 정사각형 다크 무드
  return (
    <article className="relative aspect-square bg-[#1C1917] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
      {/* 책 표지 블러 배경 */}
      {underline.book.cover_url && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${underline.book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px) saturate(0.4) brightness(0.3)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-[#1C1917]/60" />

      {/* 인용문 — 하단 크림 바(44px) 위 중앙 정렬 */}
      <Link
        href={`/underline/${underline.id}`}
        className="absolute inset-x-0 top-0 bottom-11 flex flex-col items-center justify-center px-7 text-center"
      >
        <blockquote
          className={`font-serif text-white/90 leading-[1.9] ${quoteTextSize(underline.content.length, compact ?? false)}`}
        >
          {underline.content}
        </blockquote>
        <p className="mt-4 text-white/40 text-[11px] tracking-wide line-clamp-1">
          — {underline.book.title}
          {underline.page_number ? ` · p.${underline.page_number}` : ""}
        </p>
      </Link>

      {/* 하단 크림 바 */}
      <div className="absolute bottom-0 inset-x-0 h-11 bg-[#F7F3EE]/92 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[var(--color-forest)]/20 flex items-center justify-center text-[var(--color-ink)] text-[10px] font-medium flex-shrink-0">
            {underline.user.username[0].toUpperCase()}
          </div>
          <span className="text-[var(--color-ink-muted)] text-[11px]">{underline.user.username}</span>
        </div>
        <LikeButton
          underlineId={underline.id}
          initialLiked={underline.is_liked ?? false}
          initialCount={underline.like_count}
          size="sm"
        />
      </div>
    </article>
  );
}
