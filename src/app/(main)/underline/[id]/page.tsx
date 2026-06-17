import { notFound } from "next/navigation";
import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import TagBadge from "@/components/ui/TagBadge";
import { createClient } from "@/lib/supabase/server";
import type { Underline } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

const MOCK: Underline = {
  id: "2",
  user: { id: "u2", username: "minhyuk.b", tags: ["철학", "성장", "소설"] },
  book: { id: "b2", kakao_id: "k2", title: "데미안", author: "헤르만 헤세", publisher: "민음사" },
  content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
  page_number: 112,
  is_public: true,
  like_count: 128,
  is_liked: true,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
};

type SupabaseUnderlineRow = {
  id: string;
  content: string;
  page_number: number | null;
  image_url: string | null;
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
  book: {
    id: string;
    kakao_id: string;
    title: string;
    author: string;
    publisher: string | null;
    cover_url: string | null;
  } | null;
};

type SympathizerRow = {
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    tags: string[];
  } | null;
};

type Sympathizer = {
  id: string;
  username: string;
  avatar_url: string | undefined;
  tags: string[];
};

export default async function UnderlineDetailPage({ params }: Props) {
  const { id } = await params;

  let underline: Underline | null = null;
  let sympathizers: Sympathizer[] = [];
  let usingMock = false;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("underlines")
      .select(`*, user:users!underlines_user_id_fkey(*), book:books(*)`)
      .eq("id", id)
      .single();

    if (error || !data) {
      if (id === MOCK.id) {
        usingMock = true;
        underline = MOCK;
      } else {
        notFound();
      }
    } else {
      const row = data as unknown as SupabaseUnderlineRow;
      underline = {
        id: row.id,
        content: row.content,
        page_number: row.page_number ?? undefined,
        image_url: row.image_url ?? undefined,
        is_public: row.is_public,
        like_count: row.like_count,
        created_at: row.created_at,
        user: row.user
          ? {
              id: row.user.id,
              username: row.user.username,
              bio: row.user.bio ?? undefined,
              avatar_url: row.user.avatar_url ?? undefined,
              tags: row.user.tags ?? [],
            }
          : { id: "unknown", username: "알 수 없음" },
        book: row.book
          ? {
              id: row.book.id,
              kakao_id: row.book.kakao_id,
              title: row.book.title,
              author: row.book.author,
              publisher: row.book.publisher ?? undefined,
              cover_url: row.book.cover_url ?? undefined,
            }
          : { id: "unknown", kakao_id: "", title: "알 수 없는 책", author: "" },
      };

      // Fetch sympathizers (users who liked this underline)
      const { data: likesData } = await supabase
        .from("likes")
        .select(`user_id, user:users(id, username, avatar_url, tags)`)
        .eq("underline_id", id)
        .limit(5);

      if (likesData) {
        const rows = likesData as unknown as SympathizerRow[];
        sympathizers = rows
          .filter((l) => l.user !== null)
          .map((l) => ({
            id: l.user!.id,
            username: l.user!.username,
            avatar_url: l.user!.avatar_url ?? undefined,
            tags: l.user!.tags ?? [],
          }));
      }
    }
  } catch {
    if (id === MOCK.id) {
      usingMock = true;
      underline = MOCK;
    } else {
      notFound();
    }
  }

  if (!underline) notFound();

  // Collect common tags among sympathizers
  const tagFrequency: Record<string, number> = {};
  sympathizers.forEach((u) => {
    (u.tags ?? []).forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
    });
  });
  const commonTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const extraCount = Math.max(0, underline.like_count - sympathizers.length);

  // For mock data
  const mockSympathizers: Sympathizer[] = usingMock
    ? [
        { id: "u1", username: "jiyeon_reads", tags: ["철학", "소설"], avatar_url: undefined },
        { id: "u3", username: "sora_1994", tags: ["성장", "에세이"], avatar_url: undefined },
        { id: "u5", username: "page_turner", tags: ["철학", "고전"], avatar_url: undefined },
      ]
    : [];
  const displayedSympathizers = usingMock ? mockSympathizers : sympathizers;
  const displayedCommonTags = usingMock ? ["철학", "성장소설", "고전"] : commonTags;
  const displayedExtraCount = usingMock
    ? Math.max(0, underline.like_count - mockSympathizers.length)
    : extraCount;

  return (
    <div className="space-y-6">
      {usingMock && (
        <div className="text-xs text-center text-[var(--color-ink-faint)] italic">미리보기 데이터</div>
      )}

      <Link href="/feed" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        피드로
      </Link>

      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)]">
        <div className="flex gap-3 mb-6">
          <BookCover src={underline.book.cover_url} title={underline.book.title} size="lg" />
          <div>
            <Link href={`/book/${underline.book.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-forest)] transition-colors">
              {underline.book.title}
            </Link>
            <p className="text-sm text-[var(--color-ink-faint)]">{underline.book.author}</p>
            {underline.book.publisher && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">{underline.book.publisher}</p>
            )}
            {underline.page_number && (
              <p className="text-sm text-[var(--color-ink-faint)] mt-1">p.{underline.page_number}</p>
            )}
          </div>
        </div>

        <blockquote className="font-serif text-[var(--color-ink)] text-xl leading-relaxed mb-6 border-l-2 border-[var(--color-forest)] pl-4">
          &ldquo;{underline.content}&rdquo;
        </blockquote>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <ProfileChip user={underline.user} />
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-forest)] text-[var(--color-forest)] text-sm font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1E3A2F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            {underline.like_count}
          </button>
        </div>
      </div>

      {displayedSympathizers.length > 0 && (
        <section>
          <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">같이 멈춘 사람들</h3>
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <div className="flex items-center gap-1 mb-4">
              {displayedSympathizers.map((u) => (
                <Link key={u.id} href={`/profile/${u.username}`}>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-forest-light)] flex items-center justify-center text-white text-sm font-medium -ml-1 first:ml-0 border-2 border-[var(--color-cream)] hover:scale-110 transition-transform">
                    {u.username[0].toUpperCase()}
                  </div>
                </Link>
              ))}
              {displayedExtraCount > 0 && (
                <span className="text-xs text-[var(--color-ink-faint)] ml-2">+{displayedExtraCount}명</span>
              )}
            </div>
            {displayedCommonTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-[var(--color-ink-muted)] mr-1">공통 취향</span>
                {displayedCommonTags.map((tag) => (
                  <TagBadge key={tag} label={tag} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">같은 책의 다른 밑줄</h3>
          <Link href={`/book/${underline.book.id}`} className="text-xs text-[var(--color-forest)] hover:underline">
            책 전체 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
