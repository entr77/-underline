"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import LikeButton from "@/components/features/LikeButton";
import type { Underline, CardFont, CardAlign, CardVAlign } from "@/types";

type Props = {
  underline: Underline;
  compact?: boolean;
  preview?: boolean;
};

function quoteTextSize(len: number, compact: boolean): string {
  if (compact) return "text-[12px]";
  if (len < 60)  return "text-[1.1rem]";
  if (len < 120) return "text-[0.95rem]";
  if (len < 200) return "text-[14px]";
  return "text-[13px]";
}


export default function UnderlineCard({ underline, compact, preview }: Props) {
  const [drawn, setDrawn] = useState(!!preview);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) return;
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setDrawn(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [preview]);

  const usePhoto = underline.card_style === "photo" && !!underline.image_url;
  const bookDisplay = underline.book_display ?? "full";
  const cardBg = underline.card_bg ?? "cover";
  const fontClass: Record<CardFont, string> = { serif: "font-serif", sans: "font-sans" };
  const quoteFont = fontClass[underline.card_font ?? "serif"];
  const ca = underline.card_align ?? "center";
  const textAlign  = ca === "left" ? "text-left"  : ca === "right" ? "text-right"  : "text-center";
  const itemsAlign = ca === "left" ? "items-start" : ca === "right" ? "items-end"   : "items-center";
  const justifyAlign = ca === "left" ? "justify-start" : ca === "right" ? "justify-end" : "justify-center";
  const quoteAlign = `${textAlign} ${itemsAlign}`;
  const va = (underline.card_valign ?? "bottom") as CardVAlign;
  const justifyV = va === "top" ? "justify-start" : va === "center" ? "justify-center" : "justify-end";
  const bgSrc =
    cardBg === "cover"  ? (underline.book.cover_url ?? null) :
    cardBg === "photo"  ? (underline.image_url ?? null) :
    cardBg === "search" ? (underline.card_bg_url ?? null) :
    null;

  // 책표지 전용 레이아웃 — 블러 배경 + 인용문 주인공 + 하단 표지 뱃지
  if (!usePhoto && cardBg === "cover" && underline.book.cover_url) {
    const showTitle = ["title", "title-author", "full", "full-author"].includes(bookDisplay);
    const showAuthor = ["title-author", "full-author"].includes(bookDisplay);
    return (
      <div ref={cardRef}>
        <article className="relative aspect-square rounded-xl overflow-hidden border border-[var(--color-border)]">
          {/* 블러 배경 — 어둡게 */}
          <div className="absolute inset-0 bg-[#0e0e0e]" />
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${underline.book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(16px) brightness(0.55) saturate(0.75)",
            transform: "scale(1.2)",
          }} />

          {/* 책표지 — 상단에 세로 비율 유지하며 크게 표시 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={underline.book.cover_url}
            alt=""
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "10%",
              height: "46%",
              width: "auto",
              maxWidth: "72%",
              objectFit: "contain",
              boxShadow: "0 8px 32px rgba(0,0,0,0.85)",
            }}
          />

          {/* 하단 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* 인용문 — 하단 */}
          <Link
            href={`/underline/${underline.id}`}
            className={`absolute inset-x-0 bottom-4 px-5 flex flex-col ${textAlign} ${bookDisplay !== "none" && showTitle ? "pb-7" : ""}`}
          >
            <div
              className={`w-16 h-[3px] rounded-full bg-[#FDE047]/70 mb-2.5 origin-left ${ca === "center" ? "mx-auto" : ca === "right" ? "ml-auto" : ""}`}
              style={{ animation: drawn ? "underline-draw 0.45s ease-out 0.1s forwards" : "none", transform: drawn ? undefined : "scaleX(0)" }}
            />
            <blockquote
              className={`${quoteFont} ${textAlign} text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep line-clamp-4 ${quoteTextSize(underline.content.length, compact ?? false)}`}
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)", animation: drawn ? "fade-up 0.4s ease-out 0.3s both" : "none", opacity: drawn ? undefined : 0 }}
            >
              {underline.content}
            </blockquote>
          </Link>

          {/* 책제목 — 맨 하단 */}
          {bookDisplay !== "none" && showTitle && (
            <div className="absolute left-4 bottom-4 right-4">
              <p className="text-white/45 text-[10px] leading-tight line-clamp-1 text-left" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {underline.book.title}{showAuthor ? ` — ${underline.book.author}` : ""}{underline.page_number ? ` · p.${underline.page_number}` : ""}
              </p>
            </div>
          )}
        </article>

        {/* 카드 하단 작성자 정보 */}
        {!preview && (
          <div className="px-1 pt-2.5 flex items-center justify-between gap-2">
            <Link href={`/profile/${underline.user.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                {underline.user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[var(--color-ink)] text-[12px] font-semibold leading-none truncate">{underline.user.username}</p>
                {bookDisplay !== "none" && underline.book.title && (
                  <p className="text-[var(--color-ink-faint)] text-[10px] leading-none mt-[3px] truncate">{underline.book.title}</p>
                )}
              </div>
            </Link>
            <LikeButton underlineId={underline.id} initialLiked={underline.is_liked ?? false} initialCount={underline.like_count} size="sm" />
          </div>
        )}
      </div>
    );
  }

  if (usePhoto) {
    // 사진 카드 — 풀블리드 사진 + 하단 그라디언트 위에 텍스트
    return (
      <div ref={cardRef}>
        <article className="relative aspect-square rounded-xl overflow-hidden border border-[var(--color-border)]">
          <Image
            src={underline.image_url!}
            alt="밑줄 친 페이지"
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/60 to-black/10" />

          <Link
            href={`/underline/${underline.id}`}
            className="absolute inset-x-0 bottom-4 px-5 flex flex-col justify-end"
          >
            <div
              className="w-16 h-[3px] rounded-full bg-[#FDE047]/70 mb-2.5 origin-left"
              style={{ animation: drawn ? "underline-draw 0.45s ease-out 0.1s forwards" : "none", transform: drawn ? undefined : "scaleX(0)" }}
            />
            <blockquote
              className={`${quoteFont} text-left text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep ${compact ? "text-[13px] line-clamp-3" : "text-[15px] line-clamp-5"}`}
              style={{ animation: drawn ? "fade-up 0.4s ease-out 0.3s both" : "none", opacity: drawn ? undefined : 0 }}
            >
              {underline.content}
            </blockquote>
          </Link>
        </article>

        {!preview && (
          <div className="px-1 pt-2.5 flex items-center justify-between gap-2">
            <Link href={`/profile/${underline.user.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                {underline.user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[var(--color-ink)] text-[12px] font-semibold leading-none truncate">{underline.user.username}</p>
                {bookDisplay !== "none" && underline.book.title && (
                  <p className="text-[var(--color-ink-faint)] text-[10px] leading-none mt-[3px] truncate">{underline.book.title}</p>
                )}
              </div>
            </Link>
            <LikeButton
              underlineId={underline.id}
              initialLiked={underline.is_liked ?? false}
              initialCount={underline.like_count}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  }

  // 텍스트 카드 — 정사각형 다크 무드
  return (
    <div ref={cardRef}>
    <article className="relative aspect-square bg-[#1C1917] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
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
              filter: "blur(2px) brightness(0.42) saturate(0.85)",
              transform: "scale(1.04)",
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      ) : bgSrc && cardBg === "search" ? (
        /* 이미지 선택 배경 — 선명하게 표시 + 오버레이 */
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${bgSrc})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
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
              filter: "blur(8px) saturate(0.6) brightness(0.45)",
              transform: "scale(1.15)",
            }}
          />
          <div className="absolute inset-0 bg-[#1C1917]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#1C1917]" />
      )}
      {/* 인용문 — card_valign 따름 */}
      <Link
        href={`/underline/${underline.id}`}
        className={`absolute inset-x-0 top-0 flex flex-col ${justifyV} px-5 ${
          va === "top" ? "pt-5" : va === "center" ? "" : bookDisplay !== "none" ? "pb-[3.75rem]" : "pb-4"
        } ${quoteAlign} bottom-4`}
      >
        <div
          className={`w-16 h-[3px] rounded-full bg-[#FDE047]/70 mb-2.5 origin-left ${ca === "center" ? "mx-auto" : ca === "right" ? "ml-auto" : ""}`}
          style={{ animation: drawn ? "underline-draw 0.45s ease-out 0.1s forwards" : "none", transform: drawn ? undefined : "scaleX(0)" }}
        />
        <blockquote
          className={`${quoteFont} text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep ${quoteTextSize(underline.content.length, compact ?? false)}`}
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)", animation: drawn ? "fade-up 0.4s ease-out 0.3s both" : "none", opacity: drawn ? undefined : 0 }}
        >
          {underline.content}
        </blockquote>
      </Link>

      {/* 하단 책 뱃지 */}
      {bookDisplay !== "none" && (
        <Link href={`/underline/${underline.id}`} className="absolute left-4 bottom-4 flex items-end gap-2 max-w-[75%]">
          {(bookDisplay === "cover" || bookDisplay === "full" || bookDisplay === "full-author") && underline.book.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={underline.book.cover_url} alt="" className="h-8 w-auto flex-shrink-0 rounded-[2px]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.7)" }} />
          )}
          {["title", "title-author", "full", "full-author"].includes(bookDisplay) && (
            <div className="flex flex-col min-w-0 pb-[1px]">
              <p className="text-white/60 text-[10px] leading-tight line-clamp-1 text-left" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {underline.book.title}{underline.page_number ? ` · p.${underline.page_number}` : ""}
              </p>
              {["title-author", "full-author"].includes(bookDisplay) && (
                <p className="text-white/40 text-[9px] leading-tight line-clamp-1 text-left" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                  {underline.book.author}
                </p>
              )}
            </div>
          )}
        </Link>
      )}
    </article>

    {!preview && (
      <div className="px-1 pt-2.5 flex items-center justify-between gap-2">
        <Link href={`/profile/${underline.user.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
            {underline.user.username[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[var(--color-ink)] text-[12px] font-semibold leading-none truncate">{underline.user.username}</p>
            {bookDisplay !== "none" && underline.book.title && (
              <p className="text-[var(--color-ink-faint)] text-[10px] leading-none mt-[3px] truncate">{underline.book.title}</p>
            )}
          </div>
        </Link>
        <LikeButton
          underlineId={underline.id}
          initialLiked={underline.is_liked ?? false}
          initialCount={underline.like_count}
          size="sm"
        />
      </div>
    )}
    </div>
  );
}
