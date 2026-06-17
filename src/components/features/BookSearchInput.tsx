"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { KakaoBook } from "@/app/api/books/search/route";
import Image from "next/image";

export type { KakaoBook };

type Props = {
  onSelect: (book: KakaoBook) => void;
  placeholder?: string;
};

export default function BookSearchInput({ onSelect, placeholder = "책 제목 또는 저자를 검색하세요" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<KakaoBook | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("검색 실패");
      const data: KakaoBook[] = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setSelected(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleSelect(book: KakaoBook) {
    setSelected(book);
    setQuery(book.title);
    setIsOpen(false);
    onSelect(book);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 pr-10 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:border-[var(--color-forest)] transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]">
          {isLoading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {/* Selected book preview */}
      {selected && (
        <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-forest)] bg-white">
          {selected.cover_url ? (
            <Image
              src={selected.cover_url}
              alt={selected.title}
              width={36}
              height={48}
              className="rounded object-cover flex-shrink-0"
              style={{ width: 36, height: 48 }}
            />
          ) : (
            <div className="w-9 h-12 rounded bg-[var(--color-cream-dark)] flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{selected.title}</p>
            <p className="text-xs text-[var(--color-ink-faint)] truncate">{selected.author}</p>
            {selected.publisher && (
              <p className="text-xs text-[var(--color-ink-faint)] truncate">{selected.publisher}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(""); setResults([]); }}
            className="flex-shrink-0 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="선택 취소"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-[var(--color-border)] shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-ink-faint)]">
              검색 결과가 없어요
            </div>
          ) : (
            <ul>
              {results.map((book, i) => (
                <li key={`${book.kakao_id}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(book)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-cream)] transition-colors text-left border-b border-[var(--color-border)] last:border-b-0"
                  >
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        width={32}
                        height={44}
                        className="rounded object-cover flex-shrink-0"
                        style={{ width: 32, height: 44 }}
                      />
                    ) : (
                      <div className="w-8 h-11 rounded bg-[var(--color-cream-dark)] flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-ink)] truncate">{book.title}</p>
                      <p className="text-xs text-[var(--color-ink-faint)] truncate">{book.author}</p>
                      {book.publisher && (
                        <p className="text-xs text-[var(--color-ink-faint)] truncate">{book.publisher}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
