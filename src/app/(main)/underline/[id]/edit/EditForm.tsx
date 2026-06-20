"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";

const CARD_STYLES = [
  { id: "classic", label: "크림", bg: "#F7F3EE", text: "#1C1917" },
  { id: "dark", label: "다크", bg: "#1C1917", text: "#F7F3EE" },
  { id: "forest", label: "숲", bg: "#1E3A2F", text: "#F7F3EE" },
] as const;

type Props = {
  id: string;
  initialContent: string;
  initialPageNumber: number | null;
  initialCardStyle: string;
};

export default function EditForm({ id, initialContent, initialPageNumber, initialCardStyle }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [pageNumber, setPageNumber] = useState(initialPageNumber?.toString() ?? "");
  const [cardStyle, setCardStyle] = useState(initialCardStyle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateUnderline(id, {
      content,
      pageNumber: pageNumber ? parseInt(pageNumber) : null,
      cardStyle,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/underline/${id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="font-serif text-xl text-[var(--color-ink)]">밑줄 수정</h2>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
        <label className="text-xs text-[var(--color-ink-faint)] block mb-2">밑줄 문장</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full font-serif text-[var(--color-ink)] bg-transparent outline-none resize-none leading-relaxed"
        />
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
        <label className="text-xs text-[var(--color-ink-faint)] block mb-2">페이지 번호</label>
        <input
          type="number"
          value={pageNumber}
          onChange={(e) => setPageNumber(e.target.value)}
          placeholder="예: 112"
          className="w-full text-lg font-medium text-[var(--color-ink)] bg-transparent outline-none placeholder:text-[var(--color-ink-faint)]"
        />
      </div>

      <div>
        <p className="text-xs text-[var(--color-ink-faint)] mb-2">카드 스타일</p>
        <div className="flex gap-2">
          {CARD_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setCardStyle(s.id)}
              className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === s.id ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
            >
              <div
                className="rounded-[10px] p-2.5 h-20 flex flex-col justify-between"
                style={{ backgroundColor: s.bg }}
              >
                <span
                  className="text-[18px] leading-none font-serif"
                  style={{ color: s.text, opacity: 0.3 }}
                >"</span>
                <div>
                  <div className="h-[3px] rounded-full w-full mb-1" style={{ backgroundColor: s.text, opacity: 0.2 }} />
                  <div className="h-[3px] rounded-full w-3/4" style={{ backgroundColor: s.text, opacity: 0.12 }} />
                </div>
              </div>
              <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <button
        onClick={handleSave}
        disabled={saving || !content.trim()}
        className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 transition-colors"
      >
        {saving ? "저장 중..." : "저장하기"}
      </button>
    </div>
  );
}
