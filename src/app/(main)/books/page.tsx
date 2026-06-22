import { createClient } from "@/lib/supabase/server";
import BooksGrid, { type BookGridItem } from "@/components/features/BooksGrid";

type UnderlineRow = {
  book_id: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    genre: string | null;
  } | null;
};

function aggregateBooks(rows: UnderlineRow[]): BookGridItem[] {
  // title+author 기준으로 dedup (같은 책의 판본이 여러 ISBN으로 등록된 경우 합산)
  const map = new Map<string, BookGridItem>();

  for (const row of rows) {
    if (!row.book) continue;
    const key = `${row.book.title}__${row.book.author}`;
    const existing = map.get(key);
    if (existing) {
      existing.underlineCount++;
    } else {
      map.set(key, {
        bookId: row.book.id,
        title: row.book.title,
        author: row.book.author,
        cover_url: row.book.cover_url ?? undefined,
        genre: row.book.genre ?? undefined,
        underlineCount: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.underlineCount - a.underlineCount);
}

export default async function BooksPage() {
  let books: BookGridItem[] = [];

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("underlines")
      .select("book_id, book:books(id, title, author, cover_url, genre)")
      .eq("is_public", true)
      .limit(5000);

    if (!error && data && data.length > 0) {
      books = aggregateBooks(data as unknown as UnderlineRow[]);
    }
  } catch {
    // fall through to empty state
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">
        멈춘 책들
      </h2>
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[var(--color-ink-muted)]">아직 펼쳐진 책이 없어요</p>
          <p className="text-sm text-[var(--color-ink-faint)]">밑줄을 남기면 여기에 모여요</p>
        </div>
      ) : (
        <BooksGrid books={books} />
      )}
    </div>
  );
}
