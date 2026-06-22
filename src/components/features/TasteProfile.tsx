type Props = {
  topTags: string[];
  topGenres: string[];
};

export default function TasteProfile({ topTags, topGenres }: Props) {
  if (topTags.length === 0 && topGenres.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
      <p className="text-xs font-medium text-[var(--color-ink-muted)]">취향 분석</p>

      {topTags.length > 0 && (
        <div>
          <p className="text-[11px] text-[var(--color-ink-faint)] mb-1.5">
            자주 멈추는 주제 — 내 밑줄과 좋아요에서 분석한 키워드
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-xs bg-[var(--color-forest)]/10 text-[var(--color-forest)] border border-[var(--color-forest)]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {topGenres.length > 0 && (
        <div>
          <p className="text-[11px] text-[var(--color-ink-faint)] mb-1.5">
            즐겨 읽는 장르 — 내가 밑줄 친 책들 기준
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-0.5 rounded-full text-xs bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] border border-[var(--color-border)]"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
