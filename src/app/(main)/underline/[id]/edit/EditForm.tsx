"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline, BookDisplay, CardBg, CardStyle } from "@/types";

type DisplayMode = "none" | "cover" | "title" | "full";
type EditModal = "content" | "page" | "book" | null;


const BG_GRADIENTS = [
  { css: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", label: "달빛" },
  { css: "linear-gradient(160deg, #2d0845 0%, #5c1e91 50%, #c2185b 100%)", label: "새벽" },
  { css: "linear-gradient(160deg, #0a0a2e 0%, #003973 50%, #005c97 100%)", label: "심해" },
  { css: "linear-gradient(160deg, #4b134f 0%, #c94b4b 100%)",             label: "장미" },
];

const BASE = "https://images.unsplash.com/photo-";
const PRESET_IMAGES = [
  { label: "책장",   id: "1481627834876-b7833e8f5099" },
  { label: "책 더미", id: "1497633762265-9d179a990aa6" },
  { label: "도서관",  id: "1524995997946-a1180c536408" },
  { label: "독서",   id: "1516979187457-637abb4f9353" },
  { label: "빗소리",  id: "1428278757523-f86f891cf24e" },
  { label: "안개숲",  id: "1448375240490-d3999de1abf8" },
  { label: "산안개",  id: "1506905925346-21bda4d32df4" },
  { label: "새벽",   id: "1507003211169-0a1dd7228f2d" },
].map(({ id, label }) => ({
  label,
  thumb: `${BASE}${id}?auto=format&fit=crop&w=200&q=70`,
  url:   `${BASE}${id}?auto=format&fit=crop&w=1200&q=85`,
}));

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
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  async function handleBgFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/images/upload-bg", { method: "POST", body: formData });
      const json = await res.json();
      if (json.url) { setCardBg("search"); setCardBgUrl(json.url); }
    } catch {}
    setBgUploading(false);
    e.target.value = "";
  }

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
      <div className="sticky top-0 z-10 bg-[var(--color-cream)] border-b border-[var(--color-border)] px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="font-medium text-[var(--color-ink)]">밑줄 수정</h2>
      </div>

      {/* 카드 미리보기 */}
      <div className="bg-[var(--color-cream-dark)] px-4 pt-5 pb-4">
        <div className="max-w-[380px] mx-auto pointer-events-none select-none">
          <UnderlineCard underline={previewUnderline} preview />
        </div>
      </div>

      {/* 배경 선택 스트립 */}
      <div className="bg-[var(--color-cream)] border-y border-[var(--color-border)] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 px-3 py-2.5 w-max">

          {/* 없음 */}
          <button
            type="button"
            onClick={() => { setCardBg("none"); setCardBgUrl(null); }}
            className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center border-2 transition-all ${
              cardBg === "none"
                ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]"
                : "border-[var(--color-border)] text-[var(--color-ink-faint)]"
            }`}
          >
            <span className="text-[9px] font-medium leading-none">없음</span>
          </button>

          {/* 책표지 */}
          {bookCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bookCoverUrl} alt="책표지" onClick={() => { setCardBg("cover"); setCardBgUrl(null); }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                cardBg === "cover" ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"
              }`}
            />
          )}

          {/* 업로드 사진 */}
          {hasImage && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="사진" onClick={() => { setCardBg("photo"); setCardBgUrl(null); }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                cardBg === "photo" ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"
              }`}
            />
          )}

          {/* 구분선 */}
          <div className="w-px self-stretch my-1.5 bg-[var(--color-border)] flex-shrink-0" />

          {/* 그라디언트 */}
          {BG_GRADIENTS.map(({ css }) => (
            <button key={css} type="button" onClick={() => { setCardBg("color"); setCardBgUrl(css); }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 border-2 transition-all ${
                cardBg === "color" && cardBgUrl === css ? "border-[var(--color-forest)]" : "border-transparent"
              }`}
              style={{ background: css }}
            />
          ))}

          {/* 구분선 */}
          <div className="w-px self-stretch my-1.5 bg-[var(--color-border)] flex-shrink-0" />

          {/* 사진 업로드 버튼 */}
          <button
            type="button"
            onClick={() => bgFileInputRef.current?.click()}
            disabled={bgUploading}
            className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-dashed border-[var(--color-border)] text-[var(--color-ink-faint)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-all"
          >
            {bgUploading
              ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            }
          </button>
          <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileChange} />

          {/* 큐레이션 실사 이미지 */}
          {PRESET_IMAGES.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.url} src={img.thumb} alt={img.label}
              onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                cardBg === "search" && cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent"
              }`}
            />
          ))}

          {/* Unsplash 자동 추천 */}
          {bgLoading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-11 h-11 rounded-xl flex-shrink-0 bg-[var(--color-cream-dark)] animate-pulse" />)
            : bgImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.thumb} alt="" onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                  className={`w-11 h-11 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                    cardBg === "search" && cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent"
                  }`}
                />
              ))
          }
        </div>
      </div>

      {/* 항목 버튼 목록 */}
      <div className="flex-1 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] pb-28">

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

      {/* 하단 완료 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-8 pt-3 bg-gradient-to-t from-[var(--color-cream)] to-transparent pointer-events-none">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-semibold text-sm disabled:opacity-30 pointer-events-auto hover:bg-[var(--color-forest-light)] transition-colors"
        >
          {saving ? "저장 중…" : "완료"}
        </button>
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
