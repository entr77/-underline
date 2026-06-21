"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTER_TAGS = ["전체", "위로", "사랑", "인생", "성장", "비즈니스", "재테크", "테크/AI", "사회", "육아", "종교", "유머"];

export default function FeedFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag") ?? "전체";

  function selectTag(tag: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tag === "전체") {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }
    router.push(`/feed?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
      {FILTER_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => selectTag(tag)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTag === tag
              ? "bg-[var(--color-forest)] text-white"
              : "bg-white border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
