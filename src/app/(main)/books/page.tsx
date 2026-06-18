import { createClient } from "@/lib/supabase/server";
import BookFeedCard from "@/components/features/BookFeedCard";
import type { BookSummary } from "@/components/features/BookFeedCard";

type UnderlineRow = {
  id: string;
  content: string;
  like_count: number;
  book_id: string;
  user: { username: string; avatar_url: string | null } | null;
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string | null;
    cover_url: string | null;
  } | null;
};

const MOCK_BOOKS: BookSummary[] = [
  {
    book: { id: "b2", title: "데미안", author: "헤르만 헤세", publisher: "민음사" },
    underlineCount: 12,
    totalLikes: 248,
    topUnderline: {
      content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
      username: "minhyuk.b",
    },
    readers: [{ username: "minhyuk.b" }, { username: "jiyeon_reads" }, { username: "sora_1994" }],
    extraReaders: 9,
  },
  {
    book: { id: "b1", title: "채식주의자", author: "한강", publisher: "창비" },
    underlineCount: 8,
    totalLikes: 134,
    topUnderline: {
      content: "나는 꿈을 꾸었다. 내가 짐승이 된 꿈이었다. 그건 아무렇지도 않았다.",
      username: "jiyeon_reads",
    },
    readers: [{ username: "jiyeon_reads" }, { username: "page_turner" }],
    extraReaders: 6,
  },
  {
    book: { id: "b3", title: "어린 왕자", author: "앙투안 드 생텍쥐페리", publisher: "열린책들" },
    underlineCount: 6,
    totalLikes: 97,
    topUnderline: {
      content: "사막이 아름다운 것은 어딘가에 우물을 숨기고 있기 때문이야.",
      username: "sora_1994",
    },
    readers: [{ username: "sora_1994" }, { username: "bookworm22" }],
    extraReaders: 4,
  },
];

function aggregateBooks(rows: UnderlineRow[]): BookSummary[] {
  const bookMap = new Map<string, {
    book: BookSummary["book"];
    underlines: { content: string; likeCount: number; username: string }[];
    readers: Map<string, { username: string; avatar_url?: string }>;
    totalLikes: number;
  }>();

  for (const row of rows) {
    if (!row.book) continue;

    const existing = bookMap.get(row.book_id);
    const reader = row.user
      ? { username: row.user.username, avatar_url: row.user.avatar_url ?? undefined }
      : null;

    if (existing) {
      existing.underlines.push({
        content: row.content,
        likeCount: row.like_count,
        username: row.user?.username ?? "",
      });
      existing.totalLikes += row.like_count;
      if (reader) existing.readers.set(reader.username, reader);
    } else {
      bookMap.set(row.book_id, {
        book: {
          id: row.book.id,
          title: row.book.title,
          author: row.book.author,
          publisher: row.book.publisher ?? undefined,
          cover_url: row.book.cover_url ?? undefined,
        },
        underlines: [{
          content: row.content,
          likeCount: row.like_count,
          username: row.user?.username ?? "",
        }],
        readers: reader ? new Map([[reader.username, reader]]) : new Map(),
        totalLikes: row.like_count,
      });
    }
  }

  return Array.from(bookMap.values())
    .map(({ book, underlines, readers, totalLikes }) => {
      // 좋아요 많은 밑줄을 대표로
      const sorted = [...underlines].sort((a, b) => b.likeCount - a.likeCount);
      const topUnderline = sorted[0];
      const allReaders = Array.from(readers.values());

      return {
        book,
        underlineCount: underlines.length,
        totalLikes,
        topUnderline: { content: topUnderline.content, username: topUnderline.username },
        readers: allReaders.slice(0, 4),
        extraReaders: Math.max(0, allReaders.length - 4),
      };
    })
    .sort((a, b) => b.underlineCount - a.underlineCount || b.totalLikes - a.totalLikes);
}

export default async function BooksPage() {
  let books: BookSummary[] = [];
  let usingMock = false;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("underlines")
      .select("id, content, like_count, book_id, user:users!underlines_user_id_fkey(username, avatar_url), book:books(id, title, author, publisher, cover_url)")
      .eq("is_public", true)
      .order("like_count", { ascending: false })
      .limit(300);

    if (error || !data || data.length === 0) {
      if (error) console.error("[books] supabase error:", error);
      usingMock = true;
      books = MOCK_BOOKS;
    } else {
      books = aggregateBooks(data as unknown as UnderlineRow[]);
      if (books.length === 0) {
        usingMock = true;
        books = MOCK_BOOKS;
      }
    }
  } catch {
    usingMock = true;
    books = MOCK_BOOKS;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">멈춘 책들</h2>
        {usingMock && (
          <span className="text-xs text-[var(--color-ink-faint)] italic">미리보기</span>
        )}
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[var(--color-ink-muted)]">아직 펼쳐진 책이 없어요</p>
          <p className="text-sm text-[var(--color-ink-faint)]">밑줄을 남기면 여기에 모여요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map((summary) => (
            <BookFeedCard key={summary.book.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
