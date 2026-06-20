"use client";

import Link from "next/link";
import Image from "next/image";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import type { Underline } from "@/types";

type Props = {
  underlines: Underline[];
};

function quoteTextSize(len: number): string {
  if (len < 40)  return "text-[0.92rem]";
  if (len < 80)  return "text-[0.85rem]";
  if (len < 130) return "text-[0.8rem]";
  if (len < 200) return "text-[0.75rem]";
  return "text-[0.72rem]";
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

  // 텍스트 레이아웃 — 책 표지 + 인용 카드 스택
  return (
    <article className="relative bg-[var(--color-ink)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {/* 책 표지 블러 배경 */}
      {book.cover_url && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${book.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px) saturate(0.4) brightness(0.3)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-[var(--color-ink)]/60" />

      {/* 책 표지 — 중앙 상단 */}
      <div className="relative flex justify-center pt-7 pb-5">
        <div className="shadow-2xl shadow-black/60">
          <BookCover src={book.cover_url} title={book.title} size="lg" />
        </div>
      </div>

      {/* 인용 카드 스택 */}
      <div className="relative px-4 pb-3 space-y-2">
        {underlines.map((u) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            <div className="bg-white/88 backdrop-blur-sm rounded-xl px-4 py-3">
              {u.page_number && (
                <span className="text-[10px] text-[var(--color-ink-faint)] tracking-wider font-medium">p. {u.page_number}</span>
              )}
              <blockquote className={`font-serif text-[var(--color-ink)] leading-[1.7] mt-0.5 group-hover:text-[var(--color-ink-muted)] transition-colors ${quoteTextSize(u.content.length)}`}>
                {u.content}
              </blockquote>
            </div>
          </Link>
        ))}
      </div>

      {/* 프로필 바 */}
      <div className="relative mt-3 px-4 py-3 bg-[#F7F3EE]/92 flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
