"use client";

import Link from "next/link";
import Image from "next/image";
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
  const { book, user } = first;
  const usePhoto = first.card_style === "photo" && !!first.image_url;
  const bookDisplay = first.book_display ?? "full";

  if (usePhoto) {
    // 사진 그룹 카드 — 정사각형: 상단 사진 / 하단 다크 인용 카드 스택
    return (
      <article className="aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors flex flex-col bg-[#1C1917]">
        {/* 상단 사진 영역 */}
        <div className="relative flex-none h-[42%]">
          <Image
            src={first.image_url!}
            alt="밑줄 친 페이지"
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1C1917]/80" />
        </div>

        {/* 하단: 인용 카드 스택 */}
        <div className="flex-1 flex flex-col justify-between px-3 pt-2 pb-0 min-h-0 overflow-hidden">
          <div className="space-y-1.5 overflow-hidden">
            {underlines.map((u) => (
              <Link key={u.id} href={`/underline/${u.id}`} className="block group">
                <div className="bg-white rounded-xl px-3 py-2 group-hover:bg-[var(--color-cream)] transition-colors">
                  {u.page_number && (
                    <p className="text-[9px] text-[var(--color-ink-faint)] font-medium">p. {u.page_number}</p>
                  )}
                  <blockquote className="font-serif text-[var(--color-ink)] text-[11px] leading-[1.55] line-clamp-2">
                    {u.content}
                  </blockquote>
                </div>
              </Link>
            ))}
          </div>

          {/* 하단 바 */}
          <div className="h-11 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80 text-[10px] font-medium">
                {user.username[0].toUpperCase()}
              </div>
              <span className="text-white/60 text-[11px]">{user.username}</span>
              {first.tags && first.tags.length > 0 && first.tags.map((tag) => (
                <span key={tag} className="text-[#6ee7b7] text-[10px] font-medium">#{tag}</span>
              ))}
            </div>
            <span className="text-white/30 text-[11px]">{timeAgo(first.created_at)}</span>
          </div>
        </div>
      </article>
    );
  }

  // 텍스트 그룹 카드 — 정사각형: 책 표지 히어로 + 흰 인용 카드 스택
  const showCover = bookDisplay === "cover" || bookDisplay === "full" || bookDisplay === "full-author";
  const showTitle = bookDisplay === "title" || bookDisplay === "title-author" || bookDisplay === "full" || bookDisplay === "full-author";
  const showAuthorText = bookDisplay === "title-author" || bookDisplay === "full-author";
  const hasHero = bookDisplay !== "none";
  const heroHeight = hasHero ? "h-[40%]" : "h-0";

  return (
    <article className="aspect-square relative bg-[#1C1917] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
      <div className="absolute inset-0 flex flex-col">
        {/* ── 책 히어로 (상단) — book_display가 none이면 숨김 ── */}
        {hasHero && (
          <div className={`relative flex-none ${heroHeight} flex items-center justify-center`}>
            {showCover && book.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(10px) saturate(0.4) brightness(0.4)", transform: "scale(1.1)" }}
              />
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#1C1917] to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              {showCover && (
                <Link href={`/book/${book.id}`} className="block">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="h-20 w-auto rounded"
                      style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
                    />
                  ) : (
                    <div
                      className="h-20 w-14 bg-[var(--color-forest)] rounded flex items-center justify-center"
                      style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
                    >
                      <span className="text-white/70 text-[10px] font-serif text-center px-1.5 leading-tight line-clamp-4">
                        {book.title}
                      </span>
                    </div>
                  )}
                </Link>
              )}
              {!showCover && showTitle && (
                <div className="text-center px-4">
                  <p className="text-white/70 text-xs font-medium leading-snug line-clamp-2">{book.title}</p>
                  {showAuthorText && (
                    <p className="text-white/40 text-[10px] mt-0.5">{book.author}</p>
                  )}
                </div>
              )}
            </div>
            {showCover && (showTitle || showAuthorText) && (
              <div className="absolute bottom-2 inset-x-0 text-center px-4">
                {showTitle && (
                  <p className="text-white/40 text-[10px] truncate">{book.title}</p>
                )}
                {showAuthorText && (
                  <p className="text-white/30 text-[9px] truncate">{book.author}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 인용 카드 스택 ── */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-hidden">
          {underlines.map((u) => (
            <Link key={u.id} href={`/underline/${u.id}`} className="block group">
              <div className="bg-white rounded-xl px-3 py-2 group-hover:bg-[var(--color-cream)] transition-colors">
                {u.page_number && (
                  <p className="text-[9px] text-[var(--color-ink-faint)] font-medium mb-0.5">p. {u.page_number}</p>
                )}
                <blockquote className="font-serif text-[var(--color-ink)] text-[11px] leading-[1.55] line-clamp-2">
                  {u.content}
                </blockquote>
              </div>
            </Link>
          ))}
        </div>

        {/* ── 프로필 바 (하단 크림) ── */}
        <div className="flex-none h-11 bg-[#F7F3EE]/92 px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--color-forest)]/20 flex items-center justify-center text-[var(--color-ink)] text-[10px] font-medium flex-shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-[var(--color-ink-muted)] text-[11px]">{user.username}</span>
            {first.tags && first.tags.length > 0 && first.tags.map((tag) => (
              <span key={tag} className="text-[var(--color-forest)] text-[10px] font-medium">#{tag}</span>
            ))}
          </div>
          <span className="text-[var(--color-ink-faint)] text-[11px]">{timeAgo(first.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
