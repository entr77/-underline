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
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 저자 검색"
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/10 transition-all shadow-sm"
        />
      </div>

      {/* 장르 필터 */}
      {genres.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-4 px-4">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                genre === g
                  ? "bg-[var(--color-ink)] text-white shadow-sm"
                  : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)] hover:bg-[var(--color-cream-dark)]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* 책 수 */}
      <p className="text-[11px] text-[var(--color-ink-faint)] font-medium">
        {filtered.length.toLocaleString()}권
      </p>

      {/* 4열 그리드 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[var(--color-ink-muted)] text-sm">검색 결과가 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-3 gap-y-6">
          {filtered.map((book) => (
            <Link key={book.bookId} href={`/book/${book.bookId}`} className="flex flex-col gap-1.5 group">
              {/* 표지 */}
              <div
                className="relative rounded-lg overflow-hidden bg-[var(--color-cream-dark)] shadow-sm group-hover:shadow-md transition-shadow"
                style={{ aspectRatio: "2/3" }}
              >
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-b from-[var(--color-cream)] to-[var(--color-cream-dark)]">
                    <p className="text-[8px] text-[var(--color-ink-muted)] text-center leading-snug line-clamp-4 font-serif">
                      {book.title}
                    </p>
                  </div>
                )}

                {/* 밑줄 수 뱃지 */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <span className="absolute bottom-1.5 right-1.5 text-white text-[9px] font-bold leading-none">
                  {book.underlineCount}
                </span>
              </div>

              {/* 책 정보 */}
              <div className="space-y-0.5 px-0.5">
                <p className="text-[10px] text-[var(--color-ink)] font-semibold leading-snug line-clamp-2">
                  {book.title}
                </p>
                <p className="text-[9px] text-[var(--color-ink-faint)] leading-none truncate">
                  {book.author}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
