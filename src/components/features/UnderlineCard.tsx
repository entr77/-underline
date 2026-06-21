"use client";

import Link from "next/link";
import Image from "next/image";
import LikeButton from "@/components/features/LikeButton";
import type { Underline, CardFont, CardAlign } from "@/types";

type Props = {
  underline: Underline;
  compact?: boolean;
  preview?: boolean;
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

export default function UnderlineCard({ underline, compact, preview }: Props) {
  const usePhoto = underline.card_style === "photo" && !!underline.image_url;
  const bookDisplay = underline.book_display ?? "full";
  const cardBg = underline.card_bg ?? "cover";
  const fontClass: Record<CardFont, string> = { serif: "font-serif", sans: "font-sans" };
  const quoteFont = fontClass[underline.card_font ?? "serif"];
  const alignClass: Record<CardAlign, string> = { left: "text-left items-start", center: "text-center items-center", right: "text-right items-end" };
  const quoteAlign = alignClass[underline.card_align ?? "center"];
  const bgSrc =
    cardBg === "cover"  ? (underline.book.cover_url ?? null) :
    cardBg === "photo"  ? (underline.image_url ?? null) :
    cardBg === "search" ? (underline.card_bg_url ?? null) :
    null;

  // 책표지 전용 레이아웃 — 블러 배경 + 중앙 썸네일 + 인용문
  if (!usePhoto && cardBg === "cover" && underline.book.cover_url) {
    const showTitle = ["title", "title-author", "full", "full-author"].includes(bookDisplay);
    const showAuthor = ["title-author", "full-author"].includes(bookDisplay);
    return (
      <article className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)]">
        {/* 블러 배경 */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${underline.book.cover_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(14px) brightness(0.38) saturate(0.8)",
          transform: "scale(1.12)",
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* 콘텐츠 */}
        <Link
          href={`/underline/${underline.id}`}
          className={`absolute inset-x-0 top-0 ${preview ? "bottom-0" : "bottom-11"} flex flex-col justify-center px-6 gap-3 ${quoteAlign}`}
        >
          {/* 표지 썸네일 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={underline.book.cover_url}
            alt=""
            className="h-16 w-auto rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex-shrink-0"
          />

          {/* 인용문 */}
          <blockquote className={`${quoteFont} text-white/90 leading-[1.8] ${quoteTextSize(underline.content.length, compact ?? false)}`}
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            {underline.content}
          </blockquote>

          {/* 책 정보 */}
          {bookDisplay !== "none" && (showTitle || showAuthor) && (
            <div className="mt-1">
              {showTitle && (
                <p className="text-white/45 text-[10px] leading-snug line-clamp-1">
                  {underline.book.title}
                  {underline.page_number ? ` · p.${underline.page_number}` : ""}
                </p>
              )}
              {showAuthor && (
                <p className="text-white/30 text-[10px] leading-snug">{underline.book.author}</p>
              )}
            </div>
          )}
        </Link>

        {/* 하단 바 */}
        {!preview && (
          <div className="absolute bottom-0 inset-x-0 h-11 bg-[#F7F3EE]/92 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-forest)]/20 flex items-center justify-center text-[var(--color-ink)] text-[10px] font-medium flex-shrink-0">
                {underline.user.username[0].toUpperCase()}
              </div>
              <span className="text-[var(--color-ink-muted)] text-[11px]">{underline.user.username}</span>
            </div>
            <LikeButton underlineId={underline.id} initialLiked={underline.is_liked ?? false} initialCount={underline.like_count} size="sm" />
          </div>
        )}
      </article>
    );
  }

  if (usePhoto) {
    // 사진 카드 — 정사각형: 상단 사진 / 하단 다크 텍스트 영역
    const showCoverP = bookDisplay === "cover" || bookDisplay === "full" || bookDisplay === "full-author";
    const showTitleP = bookDisplay === "title" || bookDisplay === "title-author" || bookDisplay === "full" || bookDisplay === "full-author";
    const showAuthorP = bookDisplay === "title-author" || bookDisplay === "full-author";
    return (
      <article className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors flex flex-col bg-[#1C1917]">
        {/* 상단 사진 영역 */}
        <Link href={`/underline/${underline.id}`} className="relative flex-none h-[52%] block">
          <Image
            src={underline.image_url!}
            alt="밑줄 친 페이지"
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1C1917]/80" />
        </Link>

        {/* 하단 텍스트 영역 */}
        <div className="flex-1 flex flex-col justify-between px-4 pt-3 pb-0 min-h-0">
          <Link href={`/underline/${underline.id}`} className="flex-1 min-h-0">
            <blockquote
              className={`${quoteFont} text-white/90 leading-[1.7] ${compact ? "text-[11px] line-clamp-3" : "text-[13px] line-clamp-4"}`}
            >
              &ldquo;{underline.content}&rdquo;
            </blockquote>
            {bookDisplay !== "none" && (
              <div className="flex items-center gap-2 mt-2">
                {showCoverP && underline.book.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={underline.book.cover_url} alt="" className="h-5 w-auto rounded-sm opacity-70" />
                )}
                {(showTitleP || showAuthorP) && (
                  <div className="min-w-0">
                    {showTitleP && (
                      <p className="text-white/40 text-[10px] truncate">
                        {underline.book.title}
                        {underline.page_number ? ` · p.${underline.page_number}` : ""}
                      </p>
                    )}
                    {showAuthorP && (
                      <p className="text-white/30 text-[10px] truncate">{underline.book.author}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Link>

          {/* 하단 바 */}
          {!preview && (
            <div className="h-11 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80 text-[10px] font-medium flex-shrink-0">
                  {underline.user.username[0].toUpperCase()}
                </div>
                <span className="text-white/60 text-[11px]">{underline.user.username}</span>
              </div>
              <LikeButton
                underlineId={underline.id}
                initialLiked={underline.is_liked ?? false}
                initialCount={underline.like_count}
                size="sm"
              />
            </div>
          )}
        </div>
      </article>
    );
  }

  // 텍스트 카드 — 정사각형 다크 무드
  return (
    <article className="relative aspect-square bg-[#1C1917] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
      {cardBg === "color" && underline.card_bg_url ? (
        /* 단색 배경 */
        <div className="absolute inset-0" style={{ background: underline.card_bg_url }} />
      ) : bgSrc && cardBg === "cover" ? (
        /* 책표지 배경 — 살짝만 블러, 표지 인식 가능 */
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(2px) brightness(0.6) saturate(0.85)",
              transform: "scale(1.04)",
            }}
          />
          <div className="absolute inset-0 bg-black/25" />
        </>
      ) : bgSrc && cardBg === "search" ? (
        /* 이미지 선택 배경 — 선명하게 표시 + 오버레이 */
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${bgSrc})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : bgSrc ? (
        /* 업로드 사진 배경 — 블러로 분위기 */
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(8px) saturate(0.6) brightness(0.55)",
              transform: "scale(1.15)",
            }}
          />
          <div className="absolute inset-0 bg-[#1C1917]/35" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#1C1917]" />
      )}

      {/* 인용문 */}
      <Link
        href={`/underline/${underline.id}`}
        className={`absolute inset-x-0 top-0 bottom-11 flex flex-col justify-center px-7 ${quoteAlign}`}
      >
        <blockquote
          className={`${quoteFont} text-white leading-[1.9] ${quoteTextSize(underline.content.length, compact ?? false)}`}
          style={cardBg === "search" ? { textShadow: "0 1px 8px rgba(0,0,0,0.8)" } : undefined}
        >
          {underline.content}
        </blockquote>
        {/* 책 정보 */}
        {bookDisplay !== "none" && (() => {
          const showCover = bookDisplay === "cover" || bookDisplay === "full" || bookDisplay === "full-author";
          const showTitle = bookDisplay === "title" || bookDisplay === "title-author" || bookDisplay === "full" || bookDisplay === "full-author";
          const showAuthor = bookDisplay === "title-author" || bookDisplay === "full-author";
          return (
            <div className={`flex items-center gap-2 mt-4 ${(underline.card_align ?? "center") === "left" ? "justify-start" : (underline.card_align ?? "center") === "right" ? "justify-end" : "justify-center"}`}>
              {showCover && underline.book.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={underline.book.cover_url} alt="" className="h-8 w-auto rounded-sm opacity-80" />
              )}
              {(showTitle || showAuthor) && (
                <div className="text-center min-w-0">
                  {showTitle && (
                    <p className="text-white/40 text-[11px] tracking-wide line-clamp-1">
                      {underline.book.title}
                      {underline.page_number ? ` · p.${underline.page_number}` : ""}
                    </p>
                  )}
                  {showAuthor && (
                    <p className="text-white/30 text-[10px] line-clamp-1">{underline.book.author}</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Link>

      {/* 하단 크림 바 */}
      {!preview && (
        <div className="absolute bottom-0 inset-x-0 h-11 bg-[#F7F3EE]/92 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[var(--color-forest)]/20 flex items-center justify-center text-[var(--color-ink)] text-[10px] font-medium flex-shrink-0">
              {underline.user.username[0].toUpperCase()}
            </div>
            <span className="text-[var(--color-ink-muted)] text-[11px]">{underline.user.username}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
            <span>{timeAgo(underline.created_at)}</span>
            <LikeButton
              underlineId={underline.id}
              initialLiked={underline.is_liked ?? false}
              initialCount={underline.like_count}
              size="sm"
            />
          </div>
        </div>
      )}
    </article>
  );
}
