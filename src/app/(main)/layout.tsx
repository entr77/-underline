import Link from "next/link";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-10 bg-[var(--color-cream)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-5 h-14 flex items-center justify-between">
        <Link href="/feed" className="font-serif text-xl font-semibold text-[var(--color-forest)] tracking-tight">
          밑줄
        </Link>
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
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
