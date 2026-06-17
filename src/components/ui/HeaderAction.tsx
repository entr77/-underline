"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderAction() {
  const pathname = usePathname();

  if (pathname === "/new") {
    return (
      <Link
        href="/feed"
        className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-[var(--color-border)] text-[var(--color-ink-muted)] text-xs font-medium hover:bg-[var(--color-cream-dark)] transition-colors"
        aria-label="피드로 돌아가기"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        <span>피드</span>
      </Link>
    );
  }

  return (
    <Link
      href="/new"
      className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[var(--color-forest)] text-white text-xs font-medium hover:bg-[var(--color-forest-light)] transition-colors"
      aria-label="밑줄 기록하기"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span>기록</span>
    </Link>
  );
}
