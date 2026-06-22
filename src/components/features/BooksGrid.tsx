"use client";

import { useState } from "react";
import Link from "next/link";

export type BookGridItem = {
  bookId: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
  underlineCount: number;
};

type Props = {
  books: BookGridItem[];
};

export default function BooksGrid({ books }: Props) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("전체");

  // 실제 장르 목록 추출
  const genres = [
    "전체",
    ...Array.from(new Set(books.map((b) => b.genre).filter(Boolean) as string[])).sort(),
  ];

  const filtered = books.filter((b) => {
    const matchGenre = genre === "전체" || b.genre === genre;
    const matchQuery =
      !query.trim() ||
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchQuery;
  });

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="책 제목, 저자 검색"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-forest)] transition-colors"
        />
      </div>

      {/* 장르 필터 */}
      {genres.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                genre === g
                  ? "bg-[var(--color-ink)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* 책 수 */}
      <p className="text-xs text-[var(--color-ink-faint)]">{filtered.length}권</p>

      {/* 4열 그리드 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[var(--color-ink-muted)]">검색 결과가 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-3 gap-y-5">
          {filtered.map((book) => (
            <Link key={book.bookId} href={`/book/${book.bookId}`} className="flex flex-col gap-1.5">
              <div
                className="relative rounded-md bg-[var(--color-cream-dark)] border border-[var(--color-border)] flex items-center justify-center p-1.5"
                style={{ aspectRatio: "2/3" }}
              >
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <p className="text-[9px] text-[var(--color-ink-faint)] text-center leading-snug line-clamp-4">
                    {book.title}
                  </p>
                )}
                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                  {book.underlineCount}
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-ink)] font-medium leading-snug line-clamp-2">
                {book.title}
              </p>
              <p className="text-[9px] text-[var(--color-ink-faint)] leading-none truncate">
                {book.author}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
