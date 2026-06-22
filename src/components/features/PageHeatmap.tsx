"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Entry = { page: number; count: number };

export default function PageHeatmap({
  entries,
  maxCount,
  selectedPage,
}: {
  entries: Entry[];
  maxCount: number;
  selectedPage?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedPage === page) {
      params.delete("pg");
    } else {
      params.set("pg", String(page));
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pg");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const isAnySelected = selectedPage !== undefined;

  return (
    <div>
      <div className="flex gap-[2px] items-end h-20">
        {entries.map((e) => {
          const isSelected = selectedPage === e.page;
          const heightPct = Math.max((e.count / maxCount) * 100, 6);
          return (
            <button
              key={e.page}
              onClick={() => handleClick(e.page)}
              title={`p.${e.page} · ${e.count}개의 밑줄`}
              className={`flex-1 min-w-[3px] rounded-t-[3px] transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-[var(--color-forest)] opacity-100 scale-y-105 origin-bottom"
                  : isAnySelected
                  ? "bg-[var(--color-forest)] opacity-[0.15] hover:opacity-40"
                  : "bg-[var(--color-forest)] opacity-50 hover:opacity-90"
              }`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--color-ink-faint)]">
          p.{entries[0].page}
        </span>
        {isAnySelected ? (
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-forest)] hover:opacity-70 transition-opacity"
          >
            p.{selectedPage} 선택됨
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
        <span className="text-[10px] text-[var(--color-ink-faint)]">
          p.{entries[entries.length - 1].page}
        </span>
      </div>
    </div>
  );
}
