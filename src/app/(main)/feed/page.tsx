import UnderlineCard from "@/components/features/UnderlineCard";
import { createClient } from "@/lib/supabase/server";
import type { Underline } from "@/types";

const MOCK_FEED: Underline[] = [
  {
    id: "1",
    user: { id: "u1", username: "jiyeon_reads", tags: ["소설", "철학"] },
    book: { id: "b1", kakao_id: "k1", title: "채식주의자", author: "한강", publisher: "창비", cover_url: "" },
    content: "나는 꿈을 꾸었다. 내가 짐승이 된 꿈이었다. 그건 아무렇지도 않았다.",
    page_number: 34,
    is_public: true,
    like_count: 42,
    is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    user: { id: "u2", username: "minhyuk.b" },
    book: { id: "b2", kakao_id: "k2", title: "데미안", author: "헤르만 헤세", cover_url: "" },
    content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
    page_number: 112,
    is_public: true,
    like_count: 128,
    is_liked: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    user: { id: "u3", username: "sora_1994", tags: ["에세이", "심리학"] },
    book: { id: "b3", kakao_id: "k3", title: "어린 왕자", author: "앙투안 드 생텍쥐페리", cover_url: "" },
    content: "사막이 아름다운 것은 어딘가에 우물을 숨기고 있기 때문이야.",
    page_number: 78,
    is_public: true,
    like_count: 89,
    is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

const FILTER_TAGS = ["전체", "소설", "철학", "에세이", "고전", "심리학"];

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

function rowToUnderline(row: SupabaseUnderlineRow): Underline {
  return {
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
}

export default async function FeedPage() {
  let feed: Underline[] = [];
  let usingMock = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("underlines")
      .select(`*, user:users!underlines_user_id_fkey(*), book:books(*)`)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      if (error) console.error("[feed] supabase error:", error);
      else console.log("[feed] underlines empty, using mock");
      usingMock = true;
      feed = MOCK_FEED;
    } else {
      feed = (data as unknown as SupabaseUnderlineRow[]).map(rowToUnderline);
    }
  } catch {
    usingMock = true;
    feed = MOCK_FEED;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">지금 누군가의 밑줄</h2>
        {usingMock && (
          <span className="text-xs text-[var(--color-ink-faint)] italic">미리보기</span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FILTER_TAGS.map((tag, i) => (
          <button
            key={tag}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              i === 0
                ? "bg-[var(--color-forest)] text-white"
                : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[var(--color-ink-muted)]">아직 아무도 멈추지 않았어요</p>
          <p className="text-sm text-[var(--color-ink-faint)]">당신이 멈춘 문장이 첫 번째가 될 수 있어요</p>
        </div>
      ) : (
        feed.map((u) => (
          <UnderlineCard key={u.id} underline={u} />
        ))
      )}
    </div>
  );
}
