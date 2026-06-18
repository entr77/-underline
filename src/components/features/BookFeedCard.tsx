import Link from "next/link";
import BookCover from "@/components/ui/BookCover";

type Reader = {
  username: string;
  avatar_url?: string;
};

type TopUnderline = {
  content: string;
  username: string;
};

export type BookSummary = {
  book: {
    id: string;
    title: string;
    author: string;
    publisher?: string;
    cover_url?: string;
  };
  underlineCount: number;
  totalLikes: number;
  topUnderline: TopUnderline;
  readers: Reader[];
  extraReaders: number;
};

type Props = {
  summary: BookSummary;
};

export default function BookFeedCard({ summary }: Props) {
  const { book, underlineCount, totalLikes, topUnderline, readers, extraReaders } = summary;

  return (
    <Link href={`/book/${book.id}`} className="block">
      <article className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-forest)] transition-colors">
        {/* 책 정보 */}
        <div className="p-4 flex gap-3">
          <BookCover src={book.cover_url} title={book.title} size="md" />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="font-serif font-semibold text-[var(--color-ink)] text-base leading-tight line-clamp-2">
              {book.title}
            </h3>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{book.author}</p>
            {book.publisher && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">{book.publisher}</p>
            )}
          </div>
        </div>

        {/* 대표 밑줄 */}
        <div className="mx-4 mb-4 pl-3 border-l-2 border-[var(--color-forest)]">
          <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed line-clamp-3">
            &ldquo;{topUnderline.content}&rdquo;
          </p>
          <p className="text-xs text-[var(--color-ink-faint)] mt-1.5">@{topUnderline.username}</p>
        </div>

        {/* 하단: 독자 아바타 + 통계 */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-cream)] border-t border-[var(--color-border)]">
          <div className="flex items-center">
            {readers.map((r, i) => (
              <div
                key={r.username}
                className="w-6 h-6 rounded-full bg-[var(--color-forest-light)] flex items-center justify-center text-white text-[10px] font-medium border-2 border-white"
                style={{ marginLeft: i === 0 ? 0 : -6 }}
              >
                {r.username[0].toUpperCase()}
              </div>
            ))}
            {extraReaders > 0 && (
              <span className="text-xs text-[var(--color-ink-faint)] ml-2">+{extraReaders}명</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--color-ink-faint)]">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
              {underlineCount}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-ink-faint)">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              {totalLikes}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
