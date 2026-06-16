import UnderlineCard from "@/components/features/UnderlineCard";
import TagBadge from "@/components/ui/TagBadge";
import type { Underline } from "@/types";

const MOCK_USER = { id: "u2", username: "minhyuk.b", bio: "읽고, 밑줄 긋고, 생각합니다.", tags: ["철학", "성장소설", "고전", "에세이"] };

const MOCK_UNDERLINES: Underline[] = [
  {
    id: "2", user: MOCK_USER,
    book: { id: "b2", kakao_id: "k2", title: "데미안", author: "헤르만 헤세" },
    content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
    page_number: 112, is_public: true, like_count: 128, is_liked: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "7", user: MOCK_USER,
    book: { id: "b5", kakao_id: "k5", title: "죄와 벌", author: "도스토옙스키" },
    content: "인간이란 무엇인가를 잃어버리고, 어디로 가야 할지 모를 때 비로소 진정한 자기 자신을 찾게 된다.",
    page_number: 289, is_public: true, like_count: 34, is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)]">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
            {MOCK_USER.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-semibold text-lg text-[var(--color-ink)]">{MOCK_USER.username}</h1>
              <button className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[var(--color-forest)] text-[var(--color-forest)] text-xs font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors">
                팔로우
              </button>
            </div>
            {MOCK_USER.bio && (
              <p className="text-sm text-[var(--color-ink-muted)] mt-1 leading-relaxed">{MOCK_USER.bio}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {MOCK_USER.tags.map((tag) => (
            <TagBadge key={tag} label={tag} />
          ))}
        </div>

        <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">{MOCK_UNDERLINES.length}</p>
            <p className="text-xs text-[var(--color-ink-faint)]">기록</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">162</p>
            <p className="text-xs text-[var(--color-ink-faint)]">공감</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)]">8</p>
            <p className="text-xs text-[var(--color-ink-faint)]">읽은 책</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">남긴 문장들</h2>
        <div className="space-y-4">
          {MOCK_UNDERLINES.map((u) => (
            <UnderlineCard key={u.id} underline={u} />
          ))}
        </div>
      </div>
    </div>
  );
}
