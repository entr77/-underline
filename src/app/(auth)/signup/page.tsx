"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { signUpWithEmailAction, signInWithGoogleAction } from "@/app/actions/auth-form";

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

        {state?.error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {state.error}
          </div>
        )}

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
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium tracking-wide hover:bg-[var(--color-forest-light)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "가입 중..." : "밑줄 시작하기"}
            </button>
          </div>
        </form>

        <form action={signInWithGoogleAction}>
          <button
            type="submit"
            className="w-full py-4 rounded-2xl border border-[var(--color-border)] bg-white flex items-center justify-center gap-3 font-medium text-[var(--color-ink)] hover:border-[var(--color-ink-faint)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google로 시작하기
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-faint)]">
          이미 읽고 계신가요?{" "}
          <Link href="/login" className="text-[var(--color-forest)] font-medium hover:underline">다시 펼쳐보기</Link>
        </p>
      </main>
    </div>
  );
}
