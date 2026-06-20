"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";

type DisplayMode = "none" | "cover" | "title" | "full";
type CardBg = "cover" | "photo" | "search" | "none";

type Props = {
  id: string;
  initialContent: string;
  initialPageNumber: number | null;
  initialCardStyle: string;
  initialBookDisplay: string;
  initialCardBg: string;
  initialCardBgUrl?: string;
  hasImage: boolean;
  imageUrl?: string;
};

export default function EditForm({ id, initialContent, initialPageNumber, initialCardStyle, initialBookDisplay, initialCardBg, initialCardBgUrl, hasImage, imageUrl }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [pageNumber, setPageNumber] = useState(initialPageNumber?.toString() ?? "");
  const [cardStyle, setCardStyle] = useState(initialCardStyle === "photo" || initialCardStyle === "text" ? initialCardStyle : "text");
  const initMode = ((): DisplayMode => {
    if (initialBookDisplay === "none") return "none";
    if (initialBookDisplay === "cover") return "cover";
    if (initialBookDisplay === "title" || initialBookDisplay === "title-author") return "title";
    return "full";
  })();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initMode);
  const [showAuthor, setShowAuthor] = useState(
    initialBookDisplay === "title-author" || initialBookDisplay === "full-author"
  );
  const bookDisplay = displayMode === "none" || displayMode === "cover"
    ? displayMode
    : showAuthor ? `${displayMode}-author` : displayMode;
  const [cardBg, setCardBg] = useState<CardBg>(
    ["cover","photo","search","none"].includes(initialCardBg) ? initialCardBg as CardBg : "cover"
  );
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(initialCardBgUrl ?? null);
  const [bgSearchResults, setBgSearchResults] = useState<string[]>([]);
  const [bgSearchLoading, setBgSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateUnderline(id, {
      content,
      pageNumber: pageNumber ? parseInt(pageNumber) : null,
      cardStyle,
      bookDisplay,
      cardBg,
      cardBgUrl,
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
          <div className="flex gap-3">
            {/* 사진 포함 */}
            <button
              onClick={() => setCardStyle("photo")}
              className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === "photo" ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
            >
              <div className="rounded-[10px] h-28 overflow-hidden bg-white border border-[var(--color-border)] flex flex-col text-left">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-14 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-full h-14 bg-[var(--color-cream-dark)] flex-shrink-0" />
                )}
                <div className="flex-1 px-2 py-1.5 overflow-hidden">
                  <p className="text-[8px] text-[var(--color-ink)] font-serif leading-tight line-clamp-3">
                    {content.trim() || "밑줄 친 문장"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">사진 포함</p>
            </button>
            {/* 텍스트만 */}
            <button
              onClick={() => setCardStyle("text")}
              className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === "text" ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
            >
              <div className="rounded-[10px] h-28 bg-[#F7F3EE] px-2.5 pt-2 pb-2 flex flex-col text-left overflow-hidden">
                <span className="text-[14px] leading-none font-serif text-[#1E3A2F] opacity-25 select-none">"</span>
                <p className="text-[8px] text-[var(--color-ink)] font-serif leading-tight mt-1 line-clamp-5">
                  {content.trim() || "밑줄 친 문장이 여기 표시됩니다"}
                </p>
              </div>
              <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">텍스트만</p>
            </button>
          </div>
        </div>
      )}

      {/* 배경 이미지 */}
      <div className="space-y-2.5">
        <p className="text-xs text-[var(--color-ink-faint)]">카드 배경</p>
        <div className="flex gap-2">
          {(
            [
              { value: "cover" as CardBg,  label: "책표지" },
              { value: "photo" as CardBg,  label: "사진", disabled: !hasImage },
              { value: "search" as CardBg, label: "이미지 선택" },
              { value: "none" as CardBg,   label: "없음" },
            ]
          ).map(({ value, label, disabled }) => (
            <button
              key={value}
              type="button"
              disabled={!!disabled}
              onClick={async () => {
                setCardBg(value);
                setCardBgUrl(null);
                if (value === "search") {
                  setBgSearchLoading(true);
                  setBgSearchResults([]);
                  try {
                    const res = await fetch(`/api/books/search?q=${encodeURIComponent(content.slice(0, 20))}`);
                    const json = await res.json();
                    const urls: string[] = (json.books ?? [])
                      .map((b: { cover_url?: string }) => b.cover_url)
                      .filter((u: string | undefined): u is string => !!u && u.length > 0);
                    setBgSearchResults(urls);
                  } finally {
                    setBgSearchLoading(false);
                  }
                }
              }}
              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                disabled
                  ? "border-[var(--color-border)] bg-white/50 text-[var(--color-ink-faint)] cursor-not-allowed"
                  : cardBg === value
                  ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {cardBg === "search" && (
          <div className="overflow-x-auto -mx-1 px-1">
            {bgSearchLoading ? (
              <p className="text-xs text-[var(--color-ink-faint)] py-3 text-center">이미지 검색 중...</p>
            ) : bgSearchResults.length > 0 ? (
              <div className="flex gap-2 pb-1">
                {bgSearchResults.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt=""
                    onClick={() => setCardBgUrl(url)}
                    className={`h-20 w-14 object-cover rounded-lg flex-shrink-0 cursor-pointer transition-all ${
                      cardBgUrl === url ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-ink-faint)] py-3 text-center">책 제목을 먼저 확인하세요</p>
            )}
          </div>
        )}
      </div>

      {/* 책 표기 방식 */}
      <div className="space-y-2.5">
        <p className="text-xs text-[var(--color-ink-faint)]">책 표기 방식</p>
        <div className="flex gap-2">
          {(
            [
              { value: "full" as DisplayMode,  label: "표지+이름" },
              { value: "cover" as DisplayMode, label: "표지만"   },
              { value: "title" as DisplayMode, label: "이름만"   },
              { value: "none" as DisplayMode,  label: "표기 안함" },
            ]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDisplayMode(value)}
              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                displayMode === value
                  ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {(displayMode === "title" || displayMode === "full") && (
          <button
            onClick={() => setShowAuthor((v) => !v)}
            className={`w-full py-2 rounded-xl border text-xs font-medium transition-all ${
              showAuthor
                ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
            }`}
          >
            {showAuthor ? "저자 표기 ✓" : "저자 표기 안함"}
          </button>
        )}
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
