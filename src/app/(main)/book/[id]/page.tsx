import { notFound } from "next/navigation";
import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import UnderlineCard from "@/components/features/UnderlineCard";
import { createClient } from "@/lib/supabase/server";
import type { Underline } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

type SupabaseUnderlineRow = {
  id: string;
  content: string;
  page_number: number | null;
  image_url: string | null;
  card_style: string | null;
  book_display: string | null;
  card_bg: string | null;
  card_bg_url: string | null;
  is_public: boolean;
  like_count: number;
  created_at: string;
  user: {
    id: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    tags: string[];
  } | null;
};

type SupabaseBookRow = {
  id: string;
  kakao_id: string;
  title: string;
  author: string;
  publisher: string | null;
  cover_url: string | null;
};

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: bookData, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (bookError || !bookData) notFound();

  const book = bookData as unknown as SupabaseBookRow;

  const { data: ulData } = await supabase
    .from("underlines")
    .select("id, content, page_number, image_url, card_style, book_display, is_public, like_count, created_at, user:users!underlines_user_id_fkey(id, username, bio, avatar_url, tags)")
    .eq("book_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const underlines: Underline[] = (ulData ?? [])
    .map((row) => {
      const r = row as unknown as SupabaseUnderlineRow;
      return {
        id: r.id,
        content: r.content,
        page_number: r.page_number ?? undefined,
        image_url: r.image_url ?? undefined,
        card_style: (r.card_style ?? "text") as import("@/types").CardStyle,
        book_display: (r.book_display ?? "full") as import("@/types").BookDisplay,
        card_bg: (r.card_bg ?? "cover") as import("@/types").CardBg,
        card_bg_url: r.card_bg_url ?? undefined,
        is_public: r.is_public,
        like_count: r.like_count,
        created_at: r.created_at,
        user: r.user
          ? {
              id: r.user.id,
              username: r.user.username,
              bio: r.user.bio ?? undefined,
              avatar_url: r.user.avatar_url ?? undefined,
              tags: r.user.tags ?? [],
            }
          : { id: "unknown", username: "알 수 없음" },
        book: {
          id: book.id,
          kakao_id: book.kakao_id,
          title: book.title,
          author: book.author,
          publisher: book.publisher ?? undefined,
          cover_url: book.cover_url ?? undefined,
        },
      };
    });

  // 페이지별 밀도 히트맵
  const pageCounts: Record<number, number> = {};
  underlines.forEach((u) => {
    if (u.page_number) pageCounts[u.page_number] = (pageCounts[u.page_number] ?? 0) + 1;
  });
  const pageEntries = Object.entries(pageCounts)
    .map(([p, c]) => ({ page: Number(p), count: c }))
    .sort((a, b) => a.page - b.page);
  const maxCount = Math.max(...pageEntries.map((e) => e.count), 1);

  const totalLikes = underlines.reduce((sum, u) => sum + u.like_count, 0);

  return (
    <div className="space-y-6">
      <Link href="/feed" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        피드로
      </Link>

      <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] flex gap-4">
        <BookCover src={book.cover_url ?? undefined} title={book.title} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-lg font-semibold text-[var(--color-ink)] leading-snug mb-1">{book.title}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mb-0.5">{book.author}</p>
          {book.publisher && <p className="text-xs text-[var(--color-ink-faint)]">{book.publisher}</p>}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-forest)" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              <span className="text-xs text-[var(--color-ink-muted)]">{underlines.length}개</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-forest)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span className="text-xs text-[var(--color-ink-muted)]">{totalLikes}</span>
            </div>
          </div>
        </div>
      </div>

      {pageEntries.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-ink-faint)] mb-3">독자들이 가장 많이 멈춘 페이지</p>
          <div className="flex gap-1 items-end h-8">
            {pageEntries.map((e) => (
              <div
                key={e.page}
                title={`p.${e.page} (${e.count}개)`}
                className="flex-1 bg-[var(--color-forest)] rounded-sm opacity-70 min-w-[4px]"
                style={{ height: `${(e.count / maxCount) * 100}%` }}
              />
            ))}
          </div>
          <p className="text-[10px] text-[var(--color-ink-faint)] mt-1.5">
            p.{pageEntries[0].page} – p.{pageEntries[pageEntries.length - 1].page}
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">이 책을 읽은 사람들의 문장</h2>
        {underlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-2xl border border-[var(--color-border)]">
            <p className="text-[var(--color-ink-muted)]">아직 아무도 이 책을 펼치지 않았어요</p>
            <p className="text-sm text-[var(--color-ink-faint)]">당신이 멈춘 문장이 이 책의 첫 기록이 돼요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {underlines.map((u) => (
              <UnderlineCard key={u.id} underline={u} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
