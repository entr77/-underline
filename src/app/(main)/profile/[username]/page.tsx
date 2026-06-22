import { notFound } from "next/navigation";
import ProfileUnderlineTabs from "@/components/features/ProfileUnderlineTabs";
import TasteProfile from "@/components/features/TasteProfile";
import EditProfileForm from "@/components/features/EditProfileForm";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import type { Underline } from "@/types";

type Props = {
  params: Promise<{ username: string }>;
};

type ProfileUser = {
  id: string;
  username: string;
  bio: string | undefined;
  occupation: string | undefined;
  avatar_url: string | undefined;
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
  card_font: string | null;
  card_align: string | null;
  card_valign: string | null;
  is_public: boolean;
  like_count: number;
  created_at: string;
  book: {
    id: string;
    kakao_id: string;
    title: string;
    author: string;
    publisher: string | null;
    cover_url: string | null;
  } | null;
};

type SupabaseUnderlineWithUserRow = SupabaseUnderlineRow & {
  user: {
    id: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    tags: string[];
  } | null;
};

const MOCK_PROFILE_USER: ProfileUser = {
  id: "u2",
  username: "minhyuk.b",
  bio: "읽고, 밑줄 긋고, 생각합니다.",
  occupation: "개발자",
  avatar_url: undefined,
};

const MOCK_UNDERLINES: Underline[] = [
  {
    id: "2",
    user: { id: "u2", username: "minhyuk.b" },
    book: { id: "b2", kakao_id: "k2", title: "데미안", author: "헤르만 헤세" },
    content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
    page_number: 112,
    is_public: true,
    like_count: 128,
    is_liked: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "7",
    user: { id: "u2", username: "minhyuk.b" },
    book: { id: "b5", kakao_id: "k5", title: "죄와 벌", author: "도스토옙스키" },
    content: "인간이란 무엇인가를 잃어버리고, 어디로 가야 할지 모를 때 비로소 진정한 자기 자신을 찾게 된다.",
    page_number: 289,
    is_public: true,
    like_count: 34,
    is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  let profileUser: ProfileUser | null = null;
  let underlines: Underline[] = [];
  let savedUnderlines: Underline[] | undefined;
  let totalLikes = 0;
  let uniqueBookCount = 0;
  let usingMock = false;
  let isOwnProfile = false;
  let topTasteTags: string[] = [];
  let topTasteGenres: string[] = [];

  try {
    const supabase = await createClient();

    const { data: rawUserData, error: userError } = await supabase
      .from("users")
      .select("id, username, bio, occupation, avatar_url")
      .eq("username", username)
      .single();

    const userData = rawUserData as unknown as {
      id: string;
      username: string;
      bio: string | null;
      occupation: string | null;
      avatar_url: string | null;
    } | null;

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (userError || !userData) {
      if (username === MOCK_PROFILE_USER.username) {
        usingMock = true;
        profileUser = MOCK_PROFILE_USER;
        underlines = MOCK_UNDERLINES;
        totalLikes = MOCK_UNDERLINES.reduce((sum, u) => sum + u.like_count, 0);
        uniqueBookCount = new Set(MOCK_UNDERLINES.map((u) => u.book.id)).size;
      } else {
        notFound();
      }
    } else {
      profileUser = {
        id: userData.id,
        username: userData.username,
        bio: userData.bio ?? undefined,
        occupation: userData.occupation ?? undefined,
        avatar_url: userData.avatar_url ?? undefined,
      };
      isOwnProfile = currentUser?.id === userData.id;

      const { data: rawTasteData } = await supabase
        .from("user_taste_profiles")
        .select("tag_scores, genre_scores, total_underlines, total_likes")
        .eq("user_id", userData.id)
        .single();

      const tasteData = rawTasteData as unknown as {
        tag_scores: Record<string, number>;
        genre_scores: Record<string, number>;
        total_underlines: number;
        total_likes: number;
      } | null;

      const hasEnoughData = (tasteData?.total_underlines ?? 0) + (tasteData?.total_likes ?? 0) >= 5;
      if (hasEnoughData && tasteData) {
        topTasteTags = Object.entries(tasteData.tag_scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([tag]) => tag);
        topTasteGenres = Object.entries(tasteData.genre_scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([genre]) => genre);
      }

      const ulBase = supabase
        .from("underlines")
        .select(
          "id, content, page_number, image_url, card_style, book_display, card_bg, card_bg_url, card_font, card_align, card_valign, is_public, like_count, created_at, book:books(id, kakao_id, title, author, publisher, cover_url)"
        )
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false });

      const { data: ulData } = await (isOwnProfile ? ulBase : ulBase.eq("is_public", true));

      if (ulData && ulData.length > 0) {
        const rows = ulData as unknown as SupabaseUnderlineRow[];
        underlines = rows.map((row) => ({
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
          card_valign: (row.card_valign ?? "bottom") as import("@/types").CardVAlign,
          is_public: row.is_public,
          like_count: row.like_count,
          created_at: row.created_at,
          user: {
            id: profileUser!.id,
            username: profileUser!.username,
            bio: profileUser!.bio,
            avatar_url: profileUser!.avatar_url,
          },
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
        }));

        totalLikes = underlines.reduce((sum, u) => sum + u.like_count, 0);
        uniqueBookCount = new Set(underlines.map((u) => u.book.id)).size;
      }

      if (isOwnProfile && currentUser) {
        const { data: likesData } = await supabase
          .from("likes")
          .select("underline_id")
          .eq("user_id", currentUser.id);

        const likedIds = (likesData ?? []).map((l: { underline_id: string }) => l.underline_id);

        if (likedIds.length > 0) {
          const { data: savedData } = await supabase
            .from("underlines")
            .select(
              "id, content, page_number, image_url, card_style, book_display, card_bg, card_bg_url, card_font, card_align, card_valign, is_public, like_count, created_at, book:books(id, kakao_id, title, author, publisher, cover_url), user:users!underlines_user_id_fkey(id, username, bio, avatar_url, tags)"
            )
            .in("id", likedIds)
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (savedData) {
            const savedRows = savedData as unknown as SupabaseUnderlineWithUserRow[];
            savedUnderlines = savedRows.map((row) => ({
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
              card_valign: (row.card_valign ?? "bottom") as import("@/types").CardVAlign,
              is_public: row.is_public,
              like_count: row.like_count,
              is_liked: true,
              created_at: row.created_at,
              user: row.user
                ? {
                    id: row.user.id,
                    username: row.user.username,
                    bio: row.user.bio ?? undefined,
                    avatar_url: row.user.avatar_url ?? undefined,
                    tags: row.user.tags ?? [],
                  }
                : { id: "unknown", username: "unknown" },
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
            }));
          }
        } else {
          savedUnderlines = [];
        }
      }
    }
  } catch {
    if (username === MOCK_PROFILE_USER.username) {
      usingMock = true;
      profileUser = MOCK_PROFILE_USER;
      underlines = MOCK_UNDERLINES;
      totalLikes = MOCK_UNDERLINES.reduce((sum, u) => sum + u.like_count, 0);
      uniqueBookCount = new Set(MOCK_UNDERLINES.map((u) => u.book.id)).size;
    } else {
      notFound();
    }
  }

  if (!profileUser) notFound();

  const initials = profileUser.username[0].toUpperCase();

  return (
    <div className="space-y-6">
      {usingMock && (
        <div className="text-xs text-center text-[var(--color-ink-faint)] italic pb-1">미리보기 데이터</div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)]">
        <div className="flex items-start gap-4 mb-4">
          {profileUser.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileUser.avatar_url}
              alt={profileUser.username}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-semibold text-lg text-[var(--color-ink)]">{profileUser.username}</h1>
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <EditProfileForm
                      bio={profileUser.bio ?? ""}
                      occupation={profileUser.occupation ?? ""}
                    />
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-faint)] text-xs font-medium hover:border-red-300 hover:text-red-400 transition-colors"
                      >
                        로그아웃
                      </button>
                    </form>
                  </>
                ) : (
                  <button className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[var(--color-forest)] text-[var(--color-forest)] text-xs font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors">
                    팔로우
                  </button>
                )}
              </div>
            </div>
            {profileUser.occupation && (
              <p className="text-xs text-[var(--color-forest)] font-medium mt-1">{profileUser.occupation}</p>
            )}
            {profileUser.bio && (
              <p className="text-sm text-[var(--color-ink-muted)] mt-0.5 leading-relaxed">{profileUser.bio}</p>
            )}
          </div>
        </div>

        <TasteProfile topTags={topTasteTags} topGenres={topTasteGenres} />

        <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">{underlines.length}</p>
            <p className="text-xs text-[var(--color-ink-faint)]">멈춘 문장</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">{totalLikes}</p>
            <p className="text-xs text-[var(--color-ink-faint)]">같이 멈춘</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">{uniqueBookCount}</p>
            <p className="text-xs text-[var(--color-ink-faint)]">펼친 책</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">
          {isOwnProfile ? "내가 멈춘 문장들" : "이 사람이 멈춘 문장들"}
        </h2>
        <ProfileUnderlineTabs underlines={underlines} isOwnProfile={isOwnProfile} savedUnderlines={savedUnderlines} />
      </div>
    </div>
  );
}
