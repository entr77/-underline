import Link from "next/link";
import HeaderAction from "@/components/ui/HeaderAction";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-10 bg-[var(--color-cream)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-5 h-14 flex items-center justify-between">
        <Link href="/feed" className="font-serif text-xl font-semibold text-[var(--color-forest)] tracking-tight">
          밑줄
        </Link>
        <HeaderAction />
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
