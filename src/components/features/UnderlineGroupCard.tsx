"use client";

import Link from "next/link";
import Image from "next/image";
import ProfileChip from "@/components/ui/ProfileChip";
import type { Underline } from "@/types";

type Props = {
  underlines: Underline[];
};

function quoteTextSize(len: number): string {
  if (len < 80)  return "text-sm";
  if (len < 160) return "text-[13px]";
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

export default function UnderlineGroupCard({ underlines }: Props) {
  const first = underlines[0];
  const { book, user } = first;
  const usePhoto = first.card_style === "photo" && !!first.image_url;

  if (usePhoto) {
    return (
      <article className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
        <div className="relative w-full aspect-[4/3] bg-[var(--color-cream-dark)]">
          <Image src={first.image_url!} alt="밑줄 친 페이지" fill className="object-cover" sizes="(max-width: 430px) 100vw, 430px" />
        </div>
        <div className="px-4 pt-4 pb-3 space-y-3">
          {underlines.map((u, i) => (
            <Link key={u.id} href={`/underline/${u.id}`} className="block group">
              {i > 0 && <div className="border-t border-[var(--color-border)] pt-3" />}
              <blockquote className="font-serif text-sm text-[var(--color-ink)] leading-relaxed group-hover:text-[var(--color-ink-muted)] transition-colors line-clamp-3">
                &ldquo;{u.content}&rdquo;
              </blockquote>
            </Link>
          ))}
        </div>
        <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <ProfileChip user={user} size="sm" />
          <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
        </div>
      </article>
    );
  }

  // 텍스트 레이아웃 — 책 표지 히어로 + 흰 인용 카드 스택
  return (
    <article className="rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-white/20 transition-colors">
      {/* ── 책 히어로 영역 ── */}
      <div className="relative h-44 flex items-center justify-center bg-[#1C1917]">
        {/* 배경: 책 표지 블러 */}
        {book.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(12px) saturate(0.4) brightness(0.4)", transform: "scale(1.15)" }}
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        {/* 하단 페이드 */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1C1917] to-transparent" />

        {/* 책 표지 */}
        <Link href={`/book/${book.id}`} className="relative z-10 block">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-32 w-auto rounded shadow-2xl"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
            />
          ) : (
            <div
              className="h-32 w-[84px] bg-[var(--color-forest)] rounded flex items-center justify-center"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
            >
              <span className="text-white/70 text-xs font-serif text-center px-2 leading-snug line-clamp-4">
                {book.title}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ── 인용 카드 스택 ── */}
      <div className="bg-[#1C1917] px-3 pb-3 space-y-2">
        {underlines.map((u) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            <div className="bg-white rounded-xl px-4 py-3 group-hover:bg-[var(--color-cream)] transition-colors">
              {u.page_number && (
                <p className="text-[10px] text-[var(--color-ink-faint)] font-medium tracking-wide mb-0.5">
                  p. {u.page_number}
                </p>
              )}
              <blockquote
                className={`font-serif text-[var(--color-ink)] leading-[1.65] group-hover:text-[var(--color-ink-muted)] transition-colors ${quoteTextSize(u.content.length)}`}
              >
                {u.content}
              </blockquote>
            </div>
          </Link>
        ))}
      </div>

      {/* ── 프로필 바 ── */}
      <div className="bg-[#1C1917] px-4 pb-4 pt-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white/70 text-[11px] font-medium flex-shrink-0">
            {user.username[0].toUpperCase()}
          </div>
          <span className="text-white/50 text-xs">{user.username}</span>
        </div>
        <span className="text-white/30 text-xs">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
