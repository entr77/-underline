"use client";

import { useState } from "react";
import Link from "next/link";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline } from "@/types";

type ViewMode = "underlines" | "books" | "saved";
type UnderlineTab = "all" | "public" | "private";

type BookSummary = {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  count: number;
};

function groupByBook(underlines: Underline[]): BookSummary[] {
  const map = new Map<string, BookSummary>();
  for (const u of underlines) {
    const existing = map.get(u.book.id);
    if (existing) {
      existing.count++;
    } else {
      map.set(u.book.id, {
        id: u.book.id,
        title: u.book.title,
        author: u.book.author,
        cover_url: u.book.cover_url,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

type Props = {
  underlines: Underline[];
  isOwnProfile: boolean;
  savedUnderlines?: Underline[];
};

const IconUnderlines = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

const IconBooks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconSaved = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export default function ProfileUnderlineTabs({ underlines, isOwnProfile, savedUnderlines }: Props) {
  const [view, setView] = useState<ViewMode>("underlines");
  const [ulTab, setUlTab] = useState<UnderlineTab>("all");

  const publicCount = underlines.filter((u) => u.is_public).length;
  const privateCount = underlines.filter((u) => !u.is_public).length;
  const books = groupByBook(underlines);

  const filteredUnderlines =
    ulTab === "public"
      ? underlines.filter((u) => u.is_public)
      : ulTab === "private"
      ? underlines.filter((u) => !u.is_public)
      : underlines;

  const tabs: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: "underlines", icon: <IconUnderlines />, label: "밑줄" },
    { key: "books", icon: <IconBooks />, label: "책" },
    ...(savedUnderlines !== undefined
      ? [{ key: "saved" as ViewMode, icon: <IconSaved />, label: "저장" }]
      : []),
  ];

  const ulEmptyMessage =
    ulTab === "private"
      ? { main: "비공개 밑줄이 없어요", sub: null }
      : ulTab === "public"
      ? { main: "공개한 밑줄이 없어요", sub: null }
      : { main: "아직 멈춘 문장이 없어요", sub: "당신이 멈춘 문장이 첫 번째가 될 수 있어요" };

  return (
    <div>
      {/* 3탭 인스타그램 스타일 */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {tabs.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 flex items-center justify-center py-2.5 relative transition-colors ${
              view === key ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"
            }`}
          >
            {icon}
            {view === key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[var(--color-ink)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 밑줄 탭 */}
      {view === "underlines" && (
        <>
          {isOwnProfile && (
            <div className="flex gap-1.5 mb-4">
              {([
                { key: "all" as UnderlineTab, label: `전체 ${underlines.length}` },
                { key: "public" as UnderlineTab, label: `공개 ${publicCount}` },
                { key: "private" as UnderlineTab, label: `비공개 ${privateCount}` },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUlTab(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    ulTab === key
                      ? "bg-[var(--color-ink)] text-white"
                      : "border border-[var(--color-border)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {filteredUnderlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-[var(--color-border)]">
              <p className="text-[var(--color-ink-muted)]">{ulEmptyMessage.main}</p>
              {ulEmptyMessage.sub && (
                <p className="text-sm text-[var(--color-ink-faint)]">{ulEmptyMessage.sub}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUnderlines.map((u) => (
                <UnderlineCard key={u.id} underline={u} showVisibility={isOwnProfile} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 책 탭 */}
      {view === "books" && (
        <>
          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-[var(--color-border)]">
              <p className="text-[var(--color-ink-muted)]">밑줄 친 책이 없어요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {books.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`} className="flex flex-col gap-1.5">
                  <div
                    className="relative rounded-lg overflow-hidden bg-[var(--color-cream-dark)] border border-[var(--color-border)]"
                    style={{ aspectRatio: "2/3" }}
                  >
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-[10px] text-[var(--color-ink-faint)] text-center leading-snug line-clamp-4">
                          {book.title}
                        </p>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      {book.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-ink)] font-medium leading-snug line-clamp-2">
                    {book.title}
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-faint)] leading-none truncate">{book.author}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* 저장 탭 (본인만) */}
      {view === "saved" && savedUnderlines !== undefined && (
        <>
          {savedUnderlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-[var(--color-border)]">
              <p className="text-[var(--color-ink-muted)]">저장한 밑줄이 없어요</p>
              <p className="text-sm text-[var(--color-ink-faint)]">마음에 드는 문장에 좋아요를 눌러보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedUnderlines.map((u) => (
                <UnderlineCard key={u.id} underline={u} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
