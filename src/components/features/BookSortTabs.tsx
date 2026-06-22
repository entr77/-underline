"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  { key: "popular", label: "인기순" },
  { key: "page", label: "페이지순" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

export default function BookSortTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get("sort") ?? "popular") as SortKey;

  function select(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "popular") {
      params.delete("sort");
    } else {
      params.set("sort", key);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex gap-2">
      {SORTS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => select(key)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            active === key
              ? "bg-[var(--color-forest)] text-white border-[var(--color-forest)]"
              : "bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
