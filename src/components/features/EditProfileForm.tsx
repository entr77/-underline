"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import Alert from "@/components/ui/Alert";

const AVAILABLE_TAGS = ["소설", "철학", "에세이", "심리학", "역사", "과학", "경제", "자기계발", "시", "고전"];

type Props = {
  bio: string;
  occupation: string;
  tags: string[];
};

export default function EditProfileForm({ bio, occupation, tags }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateProfile, null);

  if (state?.success && open) setOpen(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-muted)] text-xs font-medium hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-colors"
      >
        편집
      </button>
    );
  }

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/30"
        onClick={() => setOpen(false)}
      />

      {/* sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-[430px] bg-[var(--color-cream)] rounded-t-2xl px-5 pt-5 pb-8 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[var(--color-ink)]">프로필 편집</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">직업</label>
            <input
              name="occupation"
              defaultValue={occupation}
              placeholder="예: 개발자, 디자이너, 교사..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-forest)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-1.5">자기소개</label>
            <textarea
              name="bio"
              defaultValue={bio}
              placeholder="어떤 독자인지 한 줄로 소개해주세요"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-forest)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-muted)] mb-2">주로 읽는 것들</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => {
                const checked = tags.includes(tag);
                return (
                  <label key={tag} className="cursor-pointer">
                    <input type="checkbox" name={`tag_${tag}`} defaultChecked={checked} className="sr-only" />
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      checked
                        ? "bg-[var(--color-forest)] text-white border-[var(--color-forest)]"
                        : "bg-white text-[var(--color-ink-muted)] border-[var(--color-border)]"
                    }`}>
                      {tag}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {state?.error && <Alert variant="error">{state.error}</Alert>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl bg-[var(--color-forest)] text-white text-sm font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-50 transition-colors"
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </form>
      </div>
    </>
  );
}
