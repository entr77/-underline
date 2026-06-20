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

  if (usePhoto) {
    // 사진 그룹 카드 — 정사각형 + 하단 인용 카드 스택
    return (
      <article className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
        <Image
          src={first.image_url!}
          alt="밑줄 친 페이지"
          fill
          className="object-cover"
          sizes="(max-width: 430px) 100vw, 430px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* 인용 카드들 */}
        <div className="absolute bottom-11 inset-x-0 px-3 space-y-1.5">
          {underlines.map((u) => (
            <Link key={u.id} href={`/underline/${u.id}`} className="block group">
              <div className="bg-white/90 rounded-xl px-3 py-2 group-hover:bg-white transition-colors">
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
        <div className="absolute bottom-0 inset-x-0 h-11 px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80 text-[10px] font-medium">
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-white/60 text-[11px]">{user.username}</span>
          </div>
          <span className="text-white/30 text-[11px]">{timeAgo(first.created_at)}</span>
        </div>
      </article>
    );
  }

  // 텍스트 그룹 카드 — 정사각형: 책 표지 히어로 + 흰 인용 카드 스택
  return (
    <article className="aspect-square relative bg-[#1C1917] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
      <div className="absolute inset-0 flex flex-col">
        {/* ── 책 히어로 (상단 40%) ── */}
        <div className="relative flex-none h-[40%] flex items-center justify-center">
          {book.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(10px) saturate(0.4) brightness(0.4)", transform: "scale(1.1)" }}
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
          {/* 하단 페이드 */}
          <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#1C1917] to-transparent" />

          {/* 책 표지 */}
          <Link href={`/book/${book.id}`} className="relative z-10 block">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover_url}
                alt={book.title}
                className="h-24 w-auto rounded"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
              />
            ) : (
              <div
                className="h-24 w-16 bg-[var(--color-forest)] rounded flex items-center justify-center"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.8)" }}
              >
                <span className="text-white/70 text-[10px] font-serif text-center px-1.5 leading-tight line-clamp-4">
                  {book.title}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* ── 인용 카드 스택 (중간) ── */}
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
          </div>
          <span className="text-[var(--color-ink-faint)] text-[11px]">{timeAgo(first.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
