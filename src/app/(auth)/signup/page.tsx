"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { signUpWithEmailAction } from "@/app/actions/auth-form";
import Alert from "@/components/ui/Alert";

type State = { error?: string } | null;

const INTEREST_TAGS = ["소설", "철학", "에세이", "심리학", "역사", "과학", "경제", "자기계발", "시", "고전"];

export default function SignupPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [state, formAction, isPending] = useActionState<State, FormData>(
    signUpWithEmailAction,
    null
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] flex flex-col max-w-[430px] mx-auto w-full px-5">
      <header className="h-14 flex items-center">
        <Link href="/" className="font-serif text-xl font-semibold text-[var(--color-forest)]">밑줄</Link>
      </header>

      <main className="flex-1 flex flex-col justify-center pb-16 gap-7">
        <div>
          <h1 className="font-serif text-2xl text-[var(--color-ink)] mb-1">처음 줄을 긋는 날</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">당신이 멈춘 문장부터 시작해요</p>
        </div>

        {state?.error && <Alert variant="error">{state.error}</Alert>}

        <form action={formAction} className="contents">
          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="text-xs text-[var(--color-ink-faint)] block mb-1.5">닉네임</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="나만의 닉네임"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:border-[var(--color-forest)] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-xs text-[var(--color-ink-faint)] block mb-1.5">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:border-[var(--color-forest)] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs text-[var(--color-ink-faint)] block mb-1.5">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:border-[var(--color-forest)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--color-ink-faint)] block mb-2">
              주로 읽는 것들{" "}
              <span className={selectedTags.length >= 3 ? "text-[var(--color-forest)]" : ""}>
                ({selectedTags.length}/3+)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? "bg-[var(--color-forest)] border-[var(--color-forest)] text-white"
                        : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {/* Pass selected tags as hidden inputs */}
            {selectedTags.map((tag) => (
              <input key={tag} type="hidden" name="tags" value={tag} />
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-[var(--color-ink-faint)] text-center leading-relaxed">
              가입 시{" "}
              <Link href="/terms" target="_blank" className="text-[var(--color-forest)] hover:underline">이용약관</Link>
              {" "}및{" "}
              <Link href="/privacy" target="_blank" className="text-[var(--color-forest)] hover:underline">개인정보처리방침</Link>
              에 동의하게 됩니다.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium tracking-wide hover:bg-[var(--color-forest-light)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "가입 중..." : "밑줄 시작하기"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-faint)]">
          이미 읽고 계신가요?{" "}
          <Link href="/login" className="text-[var(--color-forest)] font-medium hover:underline">다시 펼쳐보기</Link>
        </p>
      </main>
    </div>
  );
}
