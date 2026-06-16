import UnderlineCard from "@/components/features/UnderlineCard";
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
  {
    id: "4",
    user: { id: "u4", username: "bookworm_k" },
    book: { id: "b4", kakao_id: "k4", title: "82년생 김지영", author: "조남주", cover_url: "" },
    content: "평범한 삶을 살았는데 어느 날 갑자기 이상해졌다. 아니면 처음부터 이상했는데 이제야 알았거나.",
    page_number: 201,
    is_public: true,
    like_count: 56,
    is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

const FILTER_TAGS = ["전체", "소설", "철학", "에세이", "고전", "심리학"];

export default function FeedPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">오늘의 밑줄</h2>
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

      {MOCK_FEED.map((u) => (
        <UnderlineCard key={u.id} underline={u} />
      ))}
    </div>
  );
}
