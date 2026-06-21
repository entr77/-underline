"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline, BookDisplay, CardBg, CardStyle } from "@/types";

type DisplayMode = "none" | "cover" | "title" | "full";

const BG_COLORS = [
  { hex: "#1C1917", label: "블랙" },
  { hex: "#1E3A2F", label: "포레스트" },
  { hex: "#1A2744", label: "네이비" },
  { hex: "#2C1A0E", label: "브라운" },
  { hex: "#3B1218", label: "버건디" },
  { hex: "#1E1A3B", label: "인디고" },
  { hex: "#0F2E2E", label: "틸" },
  { hex: "#2D2010", label: "앰버" },
  { hex: "#2A2A2A", label: "차콜" },
  { hex: "#3D2B1F", label: "커피" },
];

type Props = {
  id: string;
  initialContent: string;
  initialPageNumber: number | null;
  initialBookDisplay: string;
  initialCardBg: string;
  initialCardBgUrl?: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  username: string;
  hasImage: boolean;
  imageUrl?: string;
};

export default function EditForm({
  id, initialContent, initialPageNumber, initialBookDisplay,
  initialCardBg, initialCardBgUrl,
  bookTitle, bookAuthor, bookCoverUrl, username,
  hasImage, imageUrl,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [pageNumber, setPageNumber] = useState(initialPageNumber?.toString() ?? "");

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
    ["photo", "search", "color", "none"].includes(initialCardBg) ? initialCardBg as CardBg : "none"
  );
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(initialCardBgUrl ?? null);
  const [bgSearchResults, setBgSearchResults] = useState<{ thumb: string; url: string }[]>([]);
  const [bgSearchLoading, setBgSearchLoading] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [bgSearchQuery, setBgSearchQuery] = useState("");
  const cardStyle: CardStyle = cardBg === "photo" ? "photo" : "text";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUnderline: Underline = {
    id,
    content: content || "밑줄 친 문장이 여기에 표시됩니다.",
    page_number: pageNumber ? parseInt(pageNumber) || undefined : undefined,
    image_url: imageUrl,
    card_style: cardStyle,
    book_display: bookDisplay as BookDisplay,
    card_bg: cardBg,
    card_bg_url: cardBgUrl ?? undefined,
    is_public: true,
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    user: { id: "", username },
    book: { id: "", kakao_id: "", title: bookTitle, author: bookAuthor, cover_url: bookCoverUrl },
  };

  async function openBgModal() {
    setCardBg("search");
    setBgModalOpen(true);
    setBgSearchQuery("");
    await doSearch(content.trim() || bookTitle, true);
  }

  async function doSearch(q: string, useTextExtraction = false) {
    if (!q.trim()) return;
    setBgSearchLoading(true);
    setBgSearchResults([]);
    try {
      const param = useTextExtraction
        ? `text=${encodeURIComponent(q.trim())}`
        : `q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(`/api/images/search?${param}`);
      const json = await res.json();
      setBgSearchResults(json.images ?? []);
      if (json.query) setBgSearchQuery(json.query);
    } finally {
      setBgSearchLoading(false);
    }
  }

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
    <div className="min-h-screen bg-[var(--color-cream)] flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[var(--color-cream)] border-b border-[var(--color-border)] px-4 h-14 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="font-medium text-[var(--color-ink)]">밑줄 수정</h2>
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="text-[var(--color-forest)] font-semibold text-sm disabled:opacity-30"
        >
          {saving ? "저장 중…" : "완료"}
        </button>
      </div>

      {/* 카드 미리보기 */}
      <div className="bg-[#1C1917] px-8 pt-8 pb-5">
        <div className="max-w-[280px] mx-auto pointer-events-none select-none">
          <UnderlineCard underline={previewUnderline} />
        </div>
        {/* 배경 선택 버튼 */}
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={openBgModal}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-all border border-white/10"
          >
            {cardBg === "color" && cardBgUrl ? (
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cardBgUrl }} />
            ) : cardBg === "search" && cardBgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cardBgUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
              </svg>
            )}
            배경 선택
          </button>
        </div>
      </div>

      {/* 편집 옵션 */}
      <div className="flex-1 px-4 py-5 space-y-4 pb-10">

        {/* 밑줄 문장 */}
        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
          <label className="text-xs text-[var(--color-ink-faint)] block mb-2">밑줄 문장</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm text-[var(--color-ink)] bg-transparent outline-none resize-none leading-relaxed max-h-28 overflow-y-auto"
          />
        </div>

        {/* 페이지 번호 */}
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

        {/* 책 표기 방식 */}
        <div className="space-y-2.5">
          <p className="text-xs text-[var(--color-ink-faint)] px-1">책 표기 방식</p>
          <div className="flex gap-2">
            {([
              { value: "full" as DisplayMode,  label: "표지+이름" },
              { value: "cover" as DisplayMode, label: "표지만"   },
              { value: "title" as DisplayMode, label: "이름만"   },
              { value: "none" as DisplayMode,  label: "표기 안함" },
            ]).map(({ value, label }) => (
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAuthor(true)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                  showAuthor
                    ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
                }`}
              >
                저자 표기
              </button>
              <button
                type="button"
                onClick={() => setShowAuthor(false)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                  !showAuthor
                    ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                    : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
                }`}
              >
                안함
              </button>
            </div>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}
      </div>

      {/* 통합 배경 선택 모달 */}
      {bgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setBgModalOpen(false)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[82vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <p className="font-semibold text-[var(--color-ink)]">배경 선택</p>
              <button type="button" onClick={() => setBgModalOpen(false)} className="text-[var(--color-ink-faint)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-5">

              {/* 없음 / 사진 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setCardBg("none"); setCardBgUrl(null); setBgModalOpen(false); }}
                  className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-all ${cardBg === "none" ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}
                >
                  없음
                </button>
                {hasImage && (
                  <button
                    type="button"
                    onClick={() => { setCardBg("photo"); setCardBgUrl(null); setBgModalOpen(false); }}
                    className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-all ${cardBg === "photo" ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]" : "border-[var(--color-border)] text-[var(--color-ink-muted)]"}`}
                  >
                    사진
                  </button>
                )}
              </div>

              {/* 단색 */}
              <div>
                <p className="text-xs text-[var(--color-ink-faint)] mb-3">단색</p>
                <div className="flex gap-2.5 flex-wrap">
                  {BG_COLORS.map(({ hex, label }) => (
                    <button
                      key={hex}
                      type="button"
                      title={label}
                      onClick={() => { setCardBg("color"); setCardBgUrl(hex); }}
                      className="w-10 h-10 rounded-full transition-all"
                      style={{
                        backgroundColor: hex,
                        outline: cardBg === "color" && cardBgUrl === hex ? "2px solid var(--color-forest)" : "2px solid transparent",
                        outlineOffset: "3px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 이미지 검색 */}
              <div>
                <p className="text-xs text-[var(--color-ink-faint)] mb-3">이미지 검색</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={bgSearchQuery}
                    onChange={(e) => setBgSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") doSearch(bgSearchQuery); }}
                    placeholder="검색어 입력..."
                    className="flex-1 bg-[var(--color-cream)] rounded-xl px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => doSearch(bgSearchQuery)}
                    disabled={bgSearchLoading || !bgSearchQuery.trim()}
                    className="px-4 py-2 bg-[var(--color-forest)] text-white text-sm rounded-xl font-medium disabled:opacity-40"
                  >
                    검색
                  </button>
                </div>
                {bgSearchLoading ? (
                  <p className="text-sm text-[var(--color-ink-faint)] text-center py-6">이미지 검색 중...</p>
                ) : bgSearchResults.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {bgSearchResults.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img.thumb}
                        alt=""
                        onClick={() => { setCardBg("search"); setCardBgUrl(img.url); setBgModalOpen(false); }}
                        className={`w-full aspect-square object-cover rounded-xl cursor-pointer transition-all ${
                          cardBg === "search" && cardBgUrl === img.url ? "ring-2 ring-[var(--color-forest)] ring-offset-2" : "opacity-80 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                ) : bgSearchQuery ? (
                  <p className="text-sm text-[var(--color-ink-faint)] text-center py-6">검색 결과가 없어요.</p>
                ) : null}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
