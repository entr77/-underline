import { Suspense } from "react";
import UnderlineCard from "@/components/features/UnderlineCard";
import UnderlineGroupCard from "@/components/features/UnderlineGroupCard";
import FeedFilter from "@/components/features/FeedFilter";
import { createClient } from "@/lib/supabase/server";
import type { Underline } from "@/types";

type FeedItem =
  | { type: "single"; underline: Underline }
  | { type: "group"; underlines: Underline[] };

function groupFeedItems(underlines: Underline[]): FeedItem[] {
  const consumed = new Set<string>();
  const items: FeedItem[] = [];

  for (const underline of underlines) {
    if (consumed.has(underline.id)) continue;

    if (underline.image_url) {
      const siblings = underlines.filter((u) => u.image_url === underline.image_url);
      siblings.forEach((u) => consumed.add(u.id));
      if (siblings.length > 1) {
        items.push({ type: "group", underlines: siblings });
      } else {
        items.push({ type: "single", underline });
      }
    } else {
      consumed.add(underline.id);
      items.push({ type: "single", underline });
    }
  }

  return items;
}

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

type SupabaseUnderlineRow = {
  id: string;
  content: string;
  page_number: number | null;
  image_url: string | null;
  card_style: string | null;
  book_display: string | null;
  card_bg: string | null;
  card_bg_url: string | null;
  card_font: string | null;
  card_align: string | null;
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
    genre: string | null;
  } | null;
};

function rowToUnderline(row: SupabaseUnderlineRow, likedIds: Set<string>): Underline {
  return {
    id: row.id,
    content: row.content,
    page_number: row.page_number ?? undefined,
    image_url: row.image_url ?? undefined,
    card_style: (row.card_style ?? "text") as import("@/types").CardStyle,
    book_display: (row.book_display ?? "full") as import("@/types").BookDisplay,
    card_bg: (row.card_bg ?? "cover") as import("@/types").CardBg,
    card_bg_url: row.card_bg_url ?? undefined,
    card_font: (row.card_font ?? "serif") as import("@/types").CardFont,
    card_align: (row.card_align ?? "center") as import("@/types").CardAlign,
    is_public: row.is_public,
    like_count: row.like_count,
    is_liked: likedIds.has(row.id),
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
          genre: row.book.genre ?? undefined,
        }
      : { id: "unknown", kakao_id: "", title: "알 수 없는 책", author: "" },
  };
}

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function FeedPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const activeTag = tag && tag !== "전체" ? tag : null;

  let feed: Underline[] = [];
  let usingMock = false;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("underlines")
      .select(`*, user:users!underlines_user_id_fkey(*), book:books(*)`)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      if (error) console.error("[feed] supabase error:", error);
      usingMock = true;
      feed = MOCK_FEED;
    } else {
      // 현재 로그인 유저의 좋아요 목록 조회
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let likedIds = new Set<string>();

      if (currentUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: likesData } = await (supabase as any)
          .from("likes")
          .select("underline_id")
          .eq("user_id", currentUser.id);

        if (likesData) {
          likedIds = new Set(
            (likesData as { underline_id: string }[]).map((l) => l.underline_id)
          );
        }
      }

      feed = (data as unknown as SupabaseUnderlineRow[]).map((row) =>
        rowToUnderline(row, likedIds)
      );
    }
  } catch {
    usingMock = true;
    feed = MOCK_FEED;
  }

  // 장르 필터: 책 genre가 선택한 장르와 일치하는 밑줄만 표시
  const filtered = activeTag
    ? feed.filter((u) => u.book.genre === activeTag)
    : feed;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">지금 누군가의 밑줄</h2>
        {usingMock && (
          <span className="text-xs text-[var(--color-ink-faint)] italic">미리보기</span>
        )}
      </div>

      <Suspense>
        <FeedFilter />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[var(--color-ink-muted)]">
            {activeTag ? `'${activeTag}' 태그의 밑줄이 아직 없어요` : "아직 아무도 멈추지 않았어요"}
          </p>
          <p className="text-sm text-[var(--color-ink-faint)]">당신이 멈춘 문장이 첫 번째가 될 수 있어요</p>
        </div>
      ) : (
        groupFeedItems(filtered).map((item) =>
          item.type === "group" ? (
            <UnderlineGroupCard key={item.underlines[0].image_url} underlines={item.underlines} />
          ) : (
            <UnderlineCard key={item.underline.id} underline={item.underline} />
          )
        )
      )}
    </div>
  );
}
