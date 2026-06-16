import Link from "next/link";

const SAMPLE_QUOTES = [
  { text: "나는 꿈을 꾸었다. 내가 짐승이 된 꿈이었다. 그건 아무렇지도 않았다.", book: "채식주의자", author: "한강" },
  { text: "사막이 아름다운 것은 어딘가에 우물을 숨기고 있기 때문이야.", book: "어린 왕자", author: "생텍쥐페리" },
  { text: "모든 시작은 그 자체로 하나의 작은 희망이다.", book: "데미안", author: "헤르만 헤세" },
];

const HOW_IT_WORKS = [
  { icon: "📸", label: "찍기", desc: "책 페이지를 사진으로" },
  { icon: "✦", label: "인식", desc: "밑줄 자동 감지" },
  { icon: "◎", label: "공유", desc: "같이 멈춘 사람 발견" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-cream)] flex flex-col max-w-[430px] mx-auto w-full">
      <header className="px-5 h-14 flex items-center">
        <span className="font-serif text-xl font-semibold text-[var(--color-forest)]">밑줄</span>
      </header>

      <main className="flex-1 flex flex-col px-5">
        <section className="pt-10 pb-8">
          <p className="text-xs tracking-widest text-[var(--color-ink-faint)] uppercase mb-5">읽은 흔적</p>
          <h1 className="font-serif text-[2rem] leading-snug text-[var(--color-ink)] mb-4">
            당신이 멈춘 문장,<br />누군가도 거기서<br />멈췄다
          </h1>
          <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed">
            사진 한 장으로 기록하고,<br />같은 자리에서 멈춘 사람들을 만납니다.
          </p>
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-2">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-lg">
                  {s.icon}
                </div>
                <p className="text-xs font-medium text-[var(--color-ink)]">{s.label}</p>
                <p className="text-[10px] text-[var(--color-ink-faint)] text-center leading-tight">{s.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center mt-3 px-5">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <svg className="mx-2 text-[var(--color-border)]" width="8" height="8" viewBox="0 0 8 8"><path d="M0 4h8M5 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>
        </section>

        <section className="space-y-3 mb-8">
          {SAMPLE_QUOTES.map((q, i) => (
            <div key={i} className="bg-white rounded-2xl px-5 py-4 border border-[var(--color-border)]">
              <blockquote className="font-serif text-[var(--color-ink)] text-sm leading-relaxed mb-2">
                &ldquo;{q.text}&rdquo;
              </blockquote>
              <p className="text-xs text-[var(--color-ink-faint)]">{q.book} — {q.author}</p>
            </div>
          ))}
        </section>

        <div className="space-y-3 pb-12">
          <Link
            href="/signup"
            className="block w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white text-center font-medium tracking-wide hover:bg-[var(--color-forest-light)] transition-colors"
          >
            첫 밑줄 긋기
          </Link>
          <Link
            href="/login"
            className="block w-full py-4 rounded-2xl border border-[var(--color-border)] text-[var(--color-ink-muted)] text-center font-medium hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-colors"
          >
            다시 읽으러
          </Link>
        </div>
      </main>
    </div>
  );
}
