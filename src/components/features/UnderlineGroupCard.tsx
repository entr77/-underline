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
  if (len < 40)  return "text-[1.35rem]";
  if (len < 80)  return "text-[1.2rem]";
  if (len < 130) return "text-[1.1rem]";
  if (len < 200) return "text-[1rem]";
  return "text-[0.92rem]";
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
  const { book, user, page_number } = first;
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
              <blockquote className="font-serif text-base text-[var(--color-ink)] leading-relaxed group-hover:text-[var(--color-ink-muted)] transition-colors line-clamp-3">
                &ldquo;{u.content}&rdquo;
              </blockquote>
            </Link>
          ))}
        </div>
        <div className="px-4 pb-4 flex items-center gap-2.5">
          <BookCover src={book.cover_url} title={book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate text-[var(--color-ink)]">{book.title}</p>
            <p className="text-[11px] truncate text-[var(--color-ink-faint)]">{book.author}{page_number ? ` · p.${page_number}` : ""}</p>
          </div>
        </div>
        <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <ProfileChip user={user} size="sm" />
          <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
        </div>
      </article>
    );
  }

  // 텍스트 레이아웃 — 문학 인용구 카드
  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {/* 인용문들 */}
      <div className="text-center px-8 pt-10 pb-8 space-y-5">
        {underlines.map((u, i) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            {i > 0 && <div className="border-t border-[var(--color-border)] pt-5" />}
            <blockquote className={`font-serif leading-[1.9] text-[var(--color-ink)] group-hover:text-[var(--color-ink-muted)] transition-colors ${quoteTextSize(u.content.length)}`}>
              <span className="text-[var(--color-forest)]">&ldquo;</span>
              {u.content}
              <span className="text-[var(--color-forest)]">&rdquo;</span>
            </blockquote>
          </Link>
        ))}
      </div>
      {/* 책 정보 — 중앙 정렬 */}
      <div className="flex flex-col items-center pb-5 px-6">
        <div className="flex items-center gap-2 w-full justify-center">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <BookCover src={book.cover_url} title={book.title} size="sm" />
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>
        <div className="text-center mt-2">
          <p className="text-[12px] font-medium text-[var(--color-ink)] leading-snug">{book.title}</p>
          <p className="text-[11px] text-[var(--color-ink-faint)] mt-0.5">{book.author}{page_number ? ` · p.${page_number}` : ""}</p>
        </div>
      </div>
      <div className="px-5 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
