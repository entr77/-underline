"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";

type Props = {
  id: string;
  initialContent: string;
  initialPageNumber: number | null;
  initialCardStyle: string;
  hasImage: boolean;
};

export default function EditForm({ id, initialContent, initialPageNumber, initialCardStyle, hasImage }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [pageNumber, setPageNumber] = useState(initialPageNumber?.toString() ?? "");
  const [cardStyle, setCardStyle] = useState(initialCardStyle === "photo" || initialCardStyle === "text" ? initialCardStyle : "text");
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

      {hasImage && (
        <div>
          <p className="text-xs text-[var(--color-ink-faint)] mb-2">카드 레이아웃</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCardStyle("photo")}
              className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === "photo" ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
            >
              <div className="rounded-[10px] h-20 overflow-hidden bg-white border border-[var(--color-border)] flex flex-col">
                <div className="flex-1 bg-[var(--color-cream-dark)]" />
                <div className="h-[28px] px-2 flex items-center">
                  <div className="h-[3px] rounded-full flex-1 bg-[var(--color-ink)] opacity-20" />
                </div>
              </div>
              <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">사진 포함</p>
            </button>
            <button
              onClick={() => setCardStyle("text")}
              className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === "text" ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
            >
              <div className="rounded-[10px] h-20 bg-[#F7F3EE] p-2.5 flex flex-col justify-between">
                <span className="text-[18px] leading-none font-serif text-[var(--color-forest)] opacity-25">"</span>
                <div>
                  <div className="h-[3px] rounded-full w-full mb-1 bg-[var(--color-ink)] opacity-20" />
                  <div className="h-[3px] rounded-full w-3/4 bg-[var(--color-ink)] opacity-12" />
                </div>
              </div>
              <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">텍스트만</p>
            </button>
          </div>
        </div>
      )}

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
