"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import LikeButton from "@/components/features/LikeButton";
import type { Underline, CardFont, CardAlign, CardVAlign, CardAnimation } from "@/types";

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

  const cardAnimation = (underline.card_animation ?? "draw") as CardAnimation;
  const barAlignClass = ca === "center" ? "mx-auto" : ca === "right" ? "ml-auto" : "";

  const mkBar = (cls = barAlignClass) => {
    if (cardAnimation === "highlight") return null;
    if (cardAnimation === "svg") {
      return (
        <svg viewBox="0 0 120 8" className={`overflow-visible mb-2.5 ${cls}`} style={{ width: "6rem", height: "8px" }}>
          <path
            d="M2 5 Q20 2 38 5 Q56 8 74 5 Q92 2 108 5"
            fill="none" stroke="#FDE047" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: drawn ? 0 : 1, transition: drawn ? "stroke-dashoffset 0.7s ease-out 0.1s" : "none" }}
          />
        </svg>
      );
    }
    return (
      <div
        className={`w-16 h-[3px] rounded-full bg-[#FDE047]/70 mb-2.5 origin-left ${cls}`}
        style={{ animation: drawn ? "underline-draw 0.45s ease-out 0.1s forwards" : "none", transform: drawn ? undefined : "scaleX(0)" }}
      />
    );
  };

  const mkBqStyle = (shadow?: string) => cardAnimation === "highlight"
    ? {
        ...(shadow ? { textShadow: shadow } : {}),
        backgroundImage: "linear-gradient(transparent 58%, rgba(253,224,71,0.4) 58%)",
        backgroundRepeat: "no-repeat" as const,
        backgroundSize: drawn ? "100% 100%" : "0% 100%",
        backgroundPosition: "left 58%",
        opacity: drawn ? 1 : 0,
        transition: "background-size 0.8s ease-out 0.2s, opacity 0.3s ease-out",
      }
    : {
        ...(shadow ? { textShadow: shadow } : {}),
        animation: drawn ? "fade-up 0.4s ease-out 0.3s both" : "none",
        opacity: drawn ? undefined : 0,
      };

  // 책표지 전용 레이아웃 — 세로 판형(3:4), ref-03~05 스타일
  if (!usePhoto && cardBg === "cover" && underline.book.cover_url) {
    const showTitle = ["title", "title-author", "full", "full-author"].includes(bookDisplay);
    const showAuthor = ["title-author", "full-author"].includes(bookDisplay);
    return (
      <div ref={cardRef}>
        <article className="relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--color-border)]">
          {/* 배경 — 책표지 블러 다크 */}
          <div className="absolute inset-0 bg-[#0d0d0d]" />
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${underline.book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(10px) brightness(0.58) saturate(0.3)",
            transform: "scale(1.05)",
          }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/60" />

          {/* 컨텐츠 — flex column */}
          <Link href={`/underline/${underline.id}`} className="absolute inset-0 flex flex-col py-6 px-5">
            {/* 책 표지 이미지 — 컨테이너 고정 높이로 짤림 방지 */}
            <div className="relative flex-shrink-0" style={{ height: "200px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={underline.book.cover_url}
                alt=""
                className="absolute left-1/2 -translate-x-1/2 h-full w-auto"
                style={{
                  maxWidth: "68%",
                  objectFit: "contain",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.9)",
                }}
              />
            </div>

            {/* 책 제목 — guillemet */}
            {showTitle && underline.book.title && (
              <div className="text-center mt-4 flex-shrink-0">
                <p className="text-white font-bold font-serif text-[1rem] leading-snug line-clamp-2">
                  {`『${underline.book.title}』`}
                </p>
                {showAuthor && underline.book.author && (
                  <p className="text-white/50 text-[10px] mt-1">{underline.book.author}</p>
                )}
              </div>
            )}

            {/* 인용문 — 남은 공간, 하단 정렬 */}
            <div className={`flex-1 flex flex-col justify-end ${textAlign} ${itemsAlign}`}>
              {mkBar()}
              <blockquote
                className={`${quoteFont} ${textAlign} text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep line-clamp-5 ${quoteTextSize(underline.content.length, compact ?? false)}`}
                style={mkBqStyle("0 1px 8px rgba(0,0,0,0.5)")}
              >
                {underline.content}
              </blockquote>
            </div>
          </Link>
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
            {mkBar("")}
            <blockquote
              className={`${quoteFont} text-left text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep ${compact ? "text-[13px] line-clamp-3" : "text-[15px] line-clamp-5"}`}
              style={mkBqStyle()}
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
        {mkBar()}
        <blockquote
          className={`${quoteFont} text-white font-semibold leading-[1.55] tracking-[-0.03em] break-keep ${quoteTextSize(underline.content.length, compact ?? false)}`}
          style={mkBqStyle("0 1px 8px rgba(0,0,0,0.6)")}
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
