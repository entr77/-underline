import Link from "next/link";
import BookCover from "@/components/ui/BookCover";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline } from "@/types";

const MOCK_BOOK = { id: "b2", kakao_id: "k2", title: "데미안", author: "헤르만 헤세", publisher: "민음사" };

const MOCK_UNDERLINES: Underline[] = [
  {
    id: "2", user: { id: "u2", username: "minhyuk.b" }, book: MOCK_BOOK,
    content: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.",
    page_number: 112, is_public: true, like_count: 128, is_liked: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "5", user: { id: "u3", username: "sora_1994" }, book: MOCK_BOOK,
    content: "모든 시작은 그 자체로 하나의 작은 희망이다.",
    page_number: 89, is_public: true, like_count: 44, is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "6", user: { id: "u5", username: "page_turner" }, book: MOCK_BOOK,
    content: "나는 내 안에서 솟구쳐 오르려는 것, 그것만을 살려고 했다. 왜 그것이 그토록 어려웠을까.",
    page_number: 156, is_public: true, like_count: 71, is_liked: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function BookDetailPage() {
  return (
    <div className="space-y-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors w-fit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        피드로
      </Link>

      <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] flex gap-4">
        <BookCover src={MOCK_BOOK.cover_url} title={MOCK_BOOK.title} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-lg font-semibold text-[var(--color-ink)] leading-snug mb-1">{MOCK_BOOK.title}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mb-1">{MOCK_BOOK.author}</p>
          <p className="text-xs text-[var(--color-ink-faint)]">{MOCK_BOOK.publisher}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-forest)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-sm text-[var(--color-ink-muted)]">밑줄 {MOCK_UNDERLINES.length}개</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-ink-faint)] mb-3">많이 밑줄 친 페이지</p>
        <div className="flex gap-1 items-end h-8">
          {[2, 5, 3, 8, 12, 6, 9, 4, 7, 3, 5, 2, 6, 11, 4].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[var(--color-forest)] rounded-sm opacity-70"
              style={{ height: `${(h / 12) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-3">모든 밑줄</h2>
        <div className="space-y-4">
          {MOCK_UNDERLINES.map((u) => (
            <UnderlineCard key={u.id} underline={u} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
