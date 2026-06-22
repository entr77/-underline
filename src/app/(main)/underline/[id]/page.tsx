import { notFound } from "next/navigation";
import Link from "next/link";
import TagBadge from "@/components/ui/TagBadge";
import LikeButton from "@/components/features/LikeButton";
import DeleteUnderlineButton from "@/components/features/DeleteUnderlineButton";
import ShareCardButton from "@/components/features/ShareCardButton";
import UnderlineCard from "@/components/features/UnderlineCard";
import { createClient } from "@/lib/supabase/server";
import type { Underline, CardStyle } from "@/types";

type Props = {
  params: Promise<{ id: string }>;
};

type SupabaseUnderlineRow = {
  id: string;
  user_id: string;
  content: string;
  page_number: number | null;
  image_url: string | null;
  card_style: string | null;
  book_display: string | null;
  card_bg: string | null;
  card_bg_url: string | null;
  card_font: string | null;
  card_align: string | null;
  card_valign: string | null;
  card_animation: string | null;
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
    occupation: string | null;
  } | null;
};

type Sympathizer = {
  id: string;
  username: string;
  avatar_url: string | undefined;
  tags: string[];
  occupation: string | undefined;
};

export default async function UnderlineDetailPage({ params }: Props) {
  const { id } = await params;

  let underline: Underline | null = null;
  let sympathizers: Sympathizer[] = [];
  let isOwner = false;

  const supabase = await createClient();

  const [{ data, error }, { data: { user: currentUser } }] = await Promise.all([
    supabase
      .from("underlines")
      .select(`*, user:users!underlines_user_id_fkey(*), book:books(*)`)
      .eq("id", id)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (error || !data) notFound();

  const row = data as unknown as SupabaseUnderlineRow;

  let isLiked = false;
  if (currentUser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: likeData } = await (supabase as any)
      .from("likes")
      .select("underline_id")
      .eq("user_id", currentUser.id)
      .eq("underline_id", id)
      .maybeSingle();
    isLiked = !!likeData;
  }

  isOwner = currentUser?.id === row.user_id;

  underline = {
    id: row.id,
    content: row.content,
    page_number: row.page_number ?? undefined,
    image_url: row.image_url ?? undefined,
    card_style: (row.card_style ?? "text") as CardStyle,
    book_display: (row.book_display ?? "full") as import("@/types").BookDisplay,
    card_bg: (row.card_bg ?? "none") as import("@/types").CardBg,
    card_bg_url: row.card_bg_url ?? undefined,
    card_font: (row.card_font ?? "serif") as import("@/types").CardFont,
    card_align: (row.card_align ?? "center") as import("@/types").CardAlign,
    card_valign: (row.card_valign ?? "bottom") as import("@/types").CardVAlign,
    card_animation: (row.card_animation ?? "draw") as import("@/types").CardAnimation,
    is_public: row.is_public,
    like_count: row.like_count,
    is_liked: isLiked,
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

  const { data: likesData } = await supabase
    .from("likes")
    .select(`user_id, user:users(id, username, avatar_url, tags, occupation)`)
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
        occupation: l.user!.occupation ?? undefined,
      }));
  }

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

  const occupationFrequency: Record<string, number> = {};
  sympathizers.forEach((u) => {
    if (u.occupation) {
      occupationFrequency[u.occupation] = (occupationFrequency[u.occupation] ?? 0) + 1;
    }
  });
  const commonOccupations = Object.entries(occupationFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([occ]) => occ);

  const extraCount = Math.max(0, underline.like_count - sympathizers.length);

  return (
    <div className="space-y-5">
      <Link href="/feed" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        피드로
      </Link>

      {/* 피드와 동일한 카드 */}
      <UnderlineCard underline={underline} />

      {/* 액션 바 */}
      <div className="flex items-center justify-between px-1">
        <Link href={`/profile/${underline.user.username}`} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
          @{underline.user.username}
        </Link>
        <div className="flex items-center gap-1">
          {isOwner && (
            <>
              <Link
                href={`/underline/${underline.id}/edit`}
                className="p-2.5 rounded-xl text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Link>
              <DeleteUnderlineButton underlineId={underline.id} />
            </>
          )}
          <ShareCardButton underline={underline} />
          <LikeButton
            underlineId={underline.id}
            initialLiked={underline.is_liked ?? false}
            initialCount={underline.like_count}
            size="md"
          />
        </div>
      </div>

      {sympathizers.length > 0 && (
        <section>
          <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">여기서 같이 멈췄어요</h3>
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <div className="flex items-center gap-1 mb-4">
              {sympathizers.map((u) => (
                <Link key={u.id} href={`/profile/${u.username}`}>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-forest-light)] flex items-center justify-center text-white text-sm font-medium -ml-1 first:ml-0 border-2 border-[var(--color-cream)] hover:scale-110 transition-transform">
                    {u.username[0].toUpperCase()}
                  </div>
                </Link>
              ))}
              {extraCount > 0 && (
                <span className="text-xs text-[var(--color-ink-faint)] ml-2">+{extraCount}명</span>
              )}
            </div>
            {commonTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs text-[var(--color-ink-muted)] mr-1">닮은 독자</span>
                {commonTags.map((tag) => (
                  <TagBadge key={tag} label={tag} />
                ))}
              </div>
            )}
            {commonOccupations.length > 0 && (
              <p className="text-xs text-[var(--color-ink-faint)]">
                {commonOccupations.join(" · ")}
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">같은 책, 다른 문장에서 멈춘 곳</h3>
        <Link
          href={`/book/${underline.book.id}`}
          className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[var(--color-border)] hover:border-[var(--color-forest)]/30 transition-colors"
        >
          {underline.book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={underline.book.cover_url}
              alt={underline.book.title}
              className="w-14 h-auto rounded object-contain flex-shrink-0 drop-shadow-sm"
            />
          ) : (
            <div className="w-14 h-20 rounded bg-[var(--color-cream-dark)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-ink-faint)]">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--color-ink)] leading-snug line-clamp-2">
              {underline.book.title}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{underline.book.author}</p>
            {underline.book.publisher && (
              <p className="text-[11px] text-[var(--color-ink-faint)] mt-0.5">{underline.book.publisher}</p>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--color-ink-faint)] flex-shrink-0">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>
      </section>
    </div>
  );
}
