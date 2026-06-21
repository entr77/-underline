"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline, BookDisplay, CardBg, CardStyle } from "@/types";

type DisplayMode = "none" | "cover" | "title" | "full";
type EditModal = "content" | "page" | "book" | null;

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
  const [bgImages, setBgImages] = useState<{ thumb: string; url: string }[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const cardStyle: CardStyle = cardBg === "photo" ? "photo" : "text";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModal>(null);

  useEffect(() => {
    const src = initialContent.trim() || bookTitle;
    if (!src) return;
    setBgLoading(true);
    fetch(`/api/images/search?text=${encodeURIComponent(src)}`)
      .then((r) => r.json())
      .then((json) => setBgImages(json.images ?? []))
      .catch(() => {})
      .finally(() => setBgLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (result.error) { setError(result.error); return; }
    router.push(`/underline/${id}`);
    router.refresh();
  }

  const bookDisplayLabel = (() => {
    if (displayMode === "none") return "표기 안함";
    if (displayMode === "cover") return "표지만";
    const base = displayMode === "title" ? "이름만" : "표지+이름";
    return showAuthor ? `${base} · 저자` : base;
  })();

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
      <div className="bg-[#1C1917] px-3 pt-4 pb-1">
        <div className="max-w-[310px] mx-auto pointer-events-none select-none">
          <UnderlineCard underline={previewUnderline} />
        </div>
      </div>

      {/* 배경 선택 스트립 */}
      <div className="bg-[#1C1917] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 px-3 py-3 w-max">

          {/* 없음 */}
          <button
            type="button"
            onClick={() => { setCardBg("none"); setCardBgUrl(null); }}
            className={`w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center gap-0.5 transition-all ${cardBg === "none" ? "ring-2 ring-white ring-offset-1 ring-offset-[#1C1917]" : "opacity-50 hover:opacity-80"}`}
            style={{ background: "#2A2520" }}
          >
            <span className="text-[9px] text-white/70 font-medium leading-none">없음</span>
          </button>

          {/* 사진 */}
          {hasImage && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="사진" onClick={() => { setCardBg("photo"); setCardBgUrl(null); }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer transition-all ${cardBg === "photo" ? "ring-2 ring-white ring-offset-1 ring-offset-[#1C1917]" : "opacity-50 hover:opacity-80"}`}
            />
          )}

          {/* 단색 */}
          {BG_COLORS.map(({ hex }) => (
            <button key={hex} type="button" onClick={() => { setCardBg("color"); setCardBgUrl(hex); }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 transition-all ${cardBg === "color" && cardBgUrl === hex ? "ring-2 ring-white ring-offset-1 ring-offset-[#1C1917]" : "opacity-50 hover:opacity-80"}`}
              style={{ background: hex }}
            />
          ))}

          {/* Unsplash 이미지 */}
          {bgLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-11 h-11 rounded-xl flex-shrink-0 bg-white/10 animate-pulse" />)
            : bgImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.thumb} alt="" onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                  className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer transition-all ${cardBg === "search" && cardBgUrl === img.url ? "ring-2 ring-white ring-offset-1 ring-offset-[#1C1917]" : "opacity-50 hover:opacity-80"}`}
                />
              ))
          }
        </div>
      </div>

      {/* 항목 버튼 목록 */}
      <div className="flex-1 bg-white divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">

        {/* 밑줄 문장 */}
        <button type="button" onClick={() => setEditModal("content")}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--color-cream)] transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-ink-faint)] mb-1">밑줄 문장</p>
            <p className="text-sm text-[var(--color-ink)] line-clamp-2 leading-relaxed">{content || "—"}</p>
          </div>
          <svg className="flex-shrink-0 text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* 페이지 번호 */}
        <button type="button" onClick={() => setEditModal("page")}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
          <p className="text-sm text-[var(--color-ink-muted)]">페이지 번호</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-ink)] font-medium">{pageNumber ? `p. ${pageNumber}` : "—"}</span>
            <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>

        {/* 책 표기 방식 */}
        <button type="button" onClick={() => setEditModal("book")}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
          <p className="text-sm text-[var(--color-ink-muted)]">책 표기 방식</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-ink)] font-medium">{bookDisplayLabel}</span>
            <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>

        {error && <div className="px-5 py-3"><Alert variant="error">{error}</Alert></div>}
      </div>

      {/* ── 모달: 밑줄 문장 ── */}
      {editModal === "content" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-semibold text-[var(--color-ink)]">밑줄 문장</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-8">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                rows={5}
                className="w-full text-sm text-[var(--color-ink)] bg-[var(--color-cream)] rounded-2xl px-4 py-3 outline-none resize-none leading-relaxed border border-[var(--color-border)] focus:border-[var(--color-forest)] transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 모달: 페이지 번호 ── */}
      {editModal === "page" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-semibold text-[var(--color-ink)]">페이지 번호</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-10">
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                autoFocus
                placeholder="예: 112"
                className="w-full text-2xl font-medium text-[var(--color-ink)] bg-[var(--color-cream)] rounded-2xl px-4 py-4 outline-none border border-[var(--color-border)] focus:border-[var(--color-forest)] transition-colors text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 모달: 책 표기 방식 ── */}
      {editModal === "book" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <p className="font-semibold text-[var(--color-ink)]">책 표기 방식</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-8 space-y-2">
              {([
                { value: "full" as DisplayMode,  label: "표지 + 이름" },
                { value: "cover" as DisplayMode, label: "표지만"      },
                { value: "title" as DisplayMode, label: "이름만"      },
                { value: "none" as DisplayMode,  label: "표기 안함"   },
              ]).map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setDisplayMode(value)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
                    displayMode === value
                      ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                      : "border-[var(--color-border)] text-[var(--color-ink-muted)]"
                  }`}>
                  <span className="text-sm font-medium">{label}</span>
                  {displayMode === value && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
              {(displayMode === "title" || displayMode === "full") && (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-ink-faint)] px-1 mb-2">저자 표기</p>
                  <div className="flex gap-2">
                    {([
                      { val: true,  label: "표기" },
                      { val: false, label: "안함" },
                    ]).map(({ val, label }) => (
                      <button key={String(val)} type="button" onClick={() => setShowAuthor(val)}
                        className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-all ${
                          showAuthor === val
                            ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                            : "border-[var(--color-border)] text-[var(--color-ink-muted)]"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
