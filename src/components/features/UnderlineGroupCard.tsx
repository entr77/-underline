"use client";

import Link from "next/link";
import Image from "next/image";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
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
  const { book, user, page_number } = first;
  const usePhoto = first.card_style === "photo" && !!first.image_url;

  if (usePhoto) {
    return (
      <article className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
        <div className="relative w-full aspect-[4/3] bg-[var(--color-cream-dark)]">
          <Image
            src={first.image_url!}
            alt="밑줄 친 페이지"
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
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
        <div className="mx-4 mb-4 bg-[var(--color-cream)] rounded-xl px-3 py-2 flex gap-3 items-center border border-[var(--color-border)]">
          <BookCover src={book.cover_url} title={book.title} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-[var(--color-ink)]">{book.title}</p>
            <p className="text-xs truncate text-[var(--color-ink-faint)]">
              {book.author}
              {page_number ? ` · p.${page_number}` : ""}
            </p>
          </div>
        </div>
        <div className="px-4 pb-4 flex items-center justify-between">
          <ProfileChip user={user} size="sm" />
          <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
        </div>
      </article>
    );
  }

  // text layout — 인용문 히어로
  return (
    <article className="bg-[var(--color-cream)] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-ink-faint)] transition-colors">
      {/* 대형 장식 인용부호 + 문장들 */}
      <div className="relative px-5 pt-8 pb-5 space-y-4">
        <span className="absolute top-0 left-3 font-serif text-[88px] leading-none select-none pointer-events-none text-[var(--color-forest)] opacity-[0.07]">
          &ldquo;
        </span>
        {underlines.map((u, i) => (
          <Link key={u.id} href={`/underline/${u.id}`} className="block group">
            {i === 0
              ? <div className="pt-6" />
              : <div className="border-t border-[var(--color-border)] pt-4" />
            }
            <blockquote className="font-serif text-[1.15rem] leading-[1.8] text-[var(--color-ink)] group-hover:text-[var(--color-ink-muted)] transition-colors">
              {u.content}
            </blockquote>
          </Link>
        ))}
      </div>
      {/* 책 정보 — 어트리뷰션 스타일 */}
      <div className="px-5 pb-4 flex items-center gap-3">
        <BookCover src={book.cover_url} title={book.title} size="sm" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium truncate text-[var(--color-ink)]">{book.title}</p>
          <p className="text-[11px] truncate text-[var(--color-ink-faint)]">
            {book.author}
            {page_number ? ` · p.${page_number}` : ""}
          </p>
        </div>
      </div>
      <div className="px-5 pb-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <ProfileChip user={user} size="sm" />
        <span className="text-xs text-[var(--color-ink-faint)]">{timeAgo(first.created_at)}</span>
      </div>
    </article>
  );
}
