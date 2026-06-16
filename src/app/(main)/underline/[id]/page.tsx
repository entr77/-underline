import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import ProfileChip from "@/components/ui/ProfileChip";
import TagBadge from "@/components/ui/TagBadge";
import type { Underline } from "@/types";

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

const SYMPATHIZERS = [
  { id: "u1", username: "jiyeon_reads", tags: ["철학", "소설"] },
  { id: "u3", username: "sora_1994", tags: ["성장", "에세이"] },
  { id: "u5", username: "page_turner", tags: ["철학", "고전"] },
];

export default function UnderlineDetailPage() {
  return (
    <div className="space-y-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        피드로
      </Link>

      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)]">
        <div className="flex gap-3 mb-6">
          <BookCover src={MOCK.book.cover_url} title={MOCK.book.title} size="lg" />
          <div>
            <Link href={`/book/${MOCK.book.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-forest)] transition-colors">
              {MOCK.book.title}
            </Link>
            <p className="text-sm text-[var(--color-ink-faint)]">{MOCK.book.author}</p>
            {MOCK.page_number && (
              <p className="text-sm text-[var(--color-ink-faint)] mt-1">p.{MOCK.page_number}</p>
            )}
          </div>
        </div>

        <blockquote className="font-serif text-[var(--color-ink)] text-xl leading-relaxed mb-6 border-l-2 border-[var(--color-forest)] pl-4">
          &ldquo;{MOCK.content}&rdquo;
        </blockquote>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <ProfileChip user={MOCK.user} />
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-forest)] text-[var(--color-forest)] text-sm font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1E3A2F"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            {MOCK.like_count}
          </button>
        </div>
      </div>

      <section>
        <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">같이 멈춘 사람들</h3>
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center gap-1 mb-4">
            {SYMPATHIZERS.map((u) => (
              <Link key={u.id} href={`/profile/${u.username}`}>
                <div className="w-9 h-9 rounded-full bg-[var(--color-forest-light)] flex items-center justify-center text-white text-sm font-medium -ml-1 first:ml-0 border-2 border-[var(--color-cream)] hover:scale-110 transition-transform">
                  {u.username[0].toUpperCase()}
                </div>
              </Link>
            ))}
            <span className="text-xs text-[var(--color-ink-faint)] ml-2">+{MOCK.like_count - SYMPATHIZERS.length}명</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[var(--color-ink-muted)] mr-1">공통 취향</span>
            {["철학", "성장소설", "고전"].map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase">이 사람들의 다른 밑줄</h3>
          <Link href={`/book/${MOCK.book.id}`} className="text-xs text-[var(--color-forest)] hover:underline">
            책 전체 보기
          </Link>
        </div>
        <div className="space-y-3">
          {["모든 시작은 그 자체로 하나의 작은 희망이다.", "사막이 아름다운 것은 어딘가에 우물을 숨기고 있기 때문이야."].map((q, i) => (
            <div key={i} className="bg-white rounded-xl px-4 py-3 border border-[var(--color-border)]">
              <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed">&ldquo;{q}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
