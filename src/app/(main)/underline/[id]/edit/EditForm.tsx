"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateUnderline } from "@/app/actions/underline";
import Alert from "@/components/ui/Alert";
import UnderlineCard from "@/components/features/UnderlineCard";
import type { Underline, BookDisplay, CardBg, CardStyle, CardFont, CardAlign, CardVAlign, CardAnimation } from "@/types";

const MAX_CONTENT = 300;
type DisplayMode = "none" | "cover" | "title" | "full";
type EditModal = "content" | "page" | "book" | "font" | "bg" | "theme" | null;


const BG_GRADIENTS = [
  { css: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", label: "달빛" },
  { css: "linear-gradient(160deg, #2d0845 0%, #5c1e91 50%, #c2185b 100%)", label: "새벽" },
  { css: "linear-gradient(160deg, #0a0a2e 0%, #003973 50%, #005c97 100%)", label: "심해" },
  { css: "linear-gradient(160deg, #4b134f 0%, #c94b4b 100%)",             label: "장미" },
];

type ThemeId = "book" | "dark" | "gradient" | "photo" | "scene";
type ThemePreset = {
  id: ThemeId; label: string; desc: string;
  cardBg: CardBg; cardBgUrl?: string; cardFont: CardFont; cardAlign: CardAlign; cardVAlign: CardVAlign;
  displayMode: DisplayMode; showAuthor: boolean;
};
const THEMES: ThemePreset[] = [
  { id: "book",     label: "북카드",    desc: "책표지 배경", cardBg: "cover",  cardFont: "serif", cardAlign: "center", cardVAlign: "bottom", displayMode: "full",  showAuthor: false },
  { id: "dark",     label: "다크",      desc: "어두운 배경", cardBg: "color",  cardBgUrl: "#1C1917",           cardFont: "serif", cardAlign: "left",   cardVAlign: "center", displayMode: "title", showAuthor: true  },
  { id: "gradient", label: "그라디언트", desc: "컬러 배경",  cardBg: "color",  cardBgUrl: BG_GRADIENTS[0].css, cardFont: "serif", cardAlign: "center", cardVAlign: "center", displayMode: "title", showAuthor: false },
  { id: "photo",    label: "밑줄",      desc: "밑줄 사진",  cardBg: "photo",  cardFont: "serif", cardAlign: "left",   cardVAlign: "bottom", displayMode: "title", showAuthor: false },
  { id: "scene",    label: "포토",      desc: "배경 사진",  cardBg: "search", cardFont: "serif", cardAlign: "center", cardVAlign: "bottom", displayMode: "title", showAuthor: false },
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
  initialCardFont: string;
  initialCardAlign: string;
  initialCardVAlign: string;
  initialCardAnimation: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  username: string;
  hasImage: boolean;
  imageUrl?: string;
};

export default function EditForm({
  id, initialContent, initialPageNumber, initialBookDisplay,
  initialCardBg, initialCardBgUrl, initialCardFont, initialCardAlign, initialCardVAlign, initialCardAnimation,
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
    (["cover", "photo", "search", "color", "none"] as string[]).includes(initialCardBg) ? initialCardBg as CardBg : "cover"
  );
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(initialCardBgUrl ?? null);
  const [bgImages, setBgImages] = useState<{ thumb: string; url: string }[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [cardFont, setCardFont] = useState<CardFont>(
    initialCardFont === "sans" ? "sans" : "serif"
  );
  const [cardAlign, setCardAlign] = useState<CardAlign>(
    (["left", "center", "right"] as CardAlign[]).includes(initialCardAlign as CardAlign)
      ? (initialCardAlign as CardAlign)
      : "center"
  );
  const [cardVAlign, setCardVAlign] = useState<CardVAlign>(
    (["top", "center", "bottom"] as CardVAlign[]).includes(initialCardVAlign as CardVAlign)
      ? (initialCardVAlign as CardVAlign)
      : "bottom"
  );
  const [cardAnimation, setCardAnimation] = useState<CardAnimation>(
    (["draw", "svg", "highlight"] as CardAnimation[]).includes(initialCardAnimation as CardAnimation)
      ? (initialCardAnimation as CardAnimation)
      : "draw"
  );
  const cardStyle: CardStyle = cardBg === "photo" ? "photo" : "text";

  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(() => {
    const bg = (["cover", "photo", "search", "color", "none"] as string[]).includes(initialCardBg) ? initialCardBg as CardBg : "cover";
    const font: CardFont = initialCardFont === "sans" ? "sans" : "serif";
    const align: CardAlign = (["left", "center", "right"] as string[]).includes(initialCardAlign) ? initialCardAlign as CardAlign : "center";
    const vAlign: CardVAlign = (["top", "center", "bottom"] as string[]).includes(initialCardVAlign) ? initialCardVAlign as CardVAlign : "bottom";
    for (const t of THEMES) {
      if (t.cardBg === bg && t.cardFont === font && t.cardAlign === align && t.cardVAlign === vAlign && t.displayMode === initMode) return t.id;
    }
    return null;
  });

  function applyTheme(themeId: ThemeId) {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setSelectedTheme(theme.id);
    setCardBg(theme.cardBg);
    setCardBgUrl(theme.cardBgUrl ?? null);
    setCardFont(theme.cardFont);
    setCardAlign(theme.cardAlign);
    setCardVAlign(theme.cardVAlign);
    setDisplayMode(theme.displayMode);
    setShowAuthor(theme.showAuthor);
    setEditModal(null);
  }

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
    card_font: cardFont,
    card_align: cardAlign,
    card_valign: cardVAlign,
    card_animation: cardAnimation,
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
      cardFont,
      cardAlign,
      cardVAlign,
      cardAnimation,
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

      {/* hidden file input (used inside bg modal) */}
      <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileChange} />

      {/* 항목 버튼 목록 */}
      <div className="flex-1 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] pb-28">

        {/* 테마 */}
        <button type="button" onClick={() => setEditModal("theme")}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
          <p className="text-sm text-[var(--color-ink-muted)]">테마</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">
              {selectedTheme ? THEMES.find((t) => t.id === selectedTheme)?.label ?? "—" : "—"}
            </span>
            <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>

        {/* 포토(scene) 테마 선택 시 이미지 스트립 */}
        {selectedTheme === "scene" && (
          <div className="px-5 py-4">
            <p className="text-xs text-[var(--color-ink-faint)] mb-3">
              배경 사진 선택
              {!cardBgUrl && <span className="text-amber-500 ml-1">· 사진을 골라주세요</span>}
            </p>
            <div className="overflow-x-auto -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 pb-1 w-max">
                {/* 업로드 버튼 */}
                <button type="button" onClick={() => bgFileInputRef.current?.click()} disabled={bgUploading}
                  className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-dashed border-[var(--color-border)] text-[var(--color-ink-faint)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-all">
                  {bgUploading
                    ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  }
                </button>
                <div className="w-px self-stretch my-2 bg-[var(--color-border)] flex-shrink-0" />
                {PRESET_IMAGES.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.url} src={img.thumb} alt={img.label}
                    onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className={`w-14 h-14 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                      cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
                {bgLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-14 h-14 rounded-xl flex-shrink-0 bg-[var(--color-cream-dark)] animate-pulse" />
                    ))
                  : bgImages.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={img.thumb} alt=""
                        onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                        className={`w-14 h-14 rounded-xl flex-shrink-0 object-cover cursor-pointer border-2 transition-all ${
                          cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      />
                    ))
                }
              </div>
            </div>
          </div>
        )}

        {/* 배경 — 테마 미선택 시만 표시 */}
        {!selectedTheme && (
          <button type="button" onClick={() => setEditModal("bg")}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
            <p className="text-sm text-[var(--color-ink-muted)]">배경</p>
            <div className="flex items-center gap-2">
              {cardBg === "none" && <span className="text-sm font-medium text-[var(--color-ink)]">없음</span>}
              {cardBg === "cover" && bookCoverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bookCoverUrl} alt="" className="w-6 h-6 rounded object-cover" />
              )}
              {cardBg === "photo" && imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-6 h-6 rounded object-cover" />
              )}
              {(cardBg === "color" || cardBg === "search") && cardBgUrl && (
                cardBg === "color"
                  ? <div className="w-6 h-6 rounded" style={{ background: cardBgUrl }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={cardBgUrl} alt="" className="w-6 h-6 rounded object-cover" />
              )}
              <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        )}

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

        {/* 책 표기 방식 — 테마 미선택 시만 표시 */}
        {!selectedTheme && (
          <button type="button" onClick={() => setEditModal("book")}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
            <p className="text-sm text-[var(--color-ink-muted)]">책 표기 방식</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-ink)] font-medium">{bookDisplayLabel}</span>
              <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        )}

        {/* 텍스트 — 테마 미선택 시만 표시 */}
        {!selectedTheme && (
          <button type="button" onClick={() => setEditModal("font")}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-cream)] transition-colors">
            <p className="text-sm text-[var(--color-ink-muted)]">텍스트</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium text-[var(--color-ink)] ${cardFont === "serif" ? "font-serif" : "font-sans"}`}>
                {cardFont === "serif" ? "명조" : "고딕"}
              </span>
              <span className="text-xs text-[var(--color-ink-faint)]">·</span>
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {cardAlign === "left" ? "좌" : cardAlign === "right" ? "우" : "가운데"}
              </span>
              <span className="text-xs text-[var(--color-ink-faint)]">·</span>
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {cardVAlign === "top" ? "상" : cardVAlign === "center" ? "중" : "하"}
              </span>
              <svg className="text-[var(--color-ink-faint)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </button>
        )}

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

      {/* ── 모달: 테마 ── */}
      {editModal === "theme" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <p className="font-semibold text-[var(--color-ink)]">카드 테마</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-8 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  const bgStyle: React.CSSProperties =
                    theme.id === "book"     ? (bookCoverUrl ? { backgroundImage: `url(${bookCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#1a1a1a" }) :
                    theme.id === "dark"     ? { background: "#1C1917" } :
                    theme.id === "gradient" ? { background: BG_GRADIENTS[0].css } :
                    theme.id === "photo"    ? (imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#2a2a2a" }) :
                                              { backgroundImage: `url(${PRESET_IMAGES[0].thumb})`, backgroundSize: "cover", backgroundPosition: "center" };
                  return (
                    <button key={theme.id} type="button" onClick={() => applyTheme(theme.id)}
                      className={`flex flex-col overflow-hidden rounded-xl border-2 transition-all ${isSelected ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"}`}>
                      <div className="relative w-full" style={{ aspectRatio: "3/4", ...bgStyle }}>
                        <div className="absolute inset-0 flex flex-col justify-end p-1.5 gap-[2px]">
                          <div className="w-3.5 h-[1.5px] rounded-full bg-yellow-300/70 mb-[2px]" />
                          <div className="w-full h-[1.5px] rounded-full bg-white/50" />
                          <div className="w-3/4 h-[1.5px] rounded-full bg-white/30" />
                        </div>
                      </div>
                      <div className="py-1.5 bg-white text-center">
                        <p className="text-[9px] font-semibold text-[var(--color-ink)]">{theme.label}</p>
                        <p className="text-[8px] text-[var(--color-ink-faint)] mt-[1px]">{theme.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--color-ink-faint)]">테마 선택 후 배경·텍스트 등을 개별로 수정할 수 있어요</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 모달: 밑줄 문장 ── */}
      {editModal === "content" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-semibold text-[var(--color-ink)]">밑줄 문장</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-8 space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
                autoFocus
                rows={5}
                maxLength={MAX_CONTENT}
                className="w-full text-sm text-[var(--color-ink)] bg-[var(--color-cream)] rounded-2xl px-4 py-3 outline-none resize-none leading-relaxed border border-[var(--color-border)] focus:border-[var(--color-forest)] transition-colors"
              />
              <p className={`text-right text-xs ${content.length >= MAX_CONTENT ? "text-red-400" : "text-[var(--color-ink-faint)]"}`}>
                {content.length}/{MAX_CONTENT}
              </p>
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

      {/* ── 모달: 배경 ── */}
      {editModal === "bg" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-white border-b border-[var(--color-border)]">
              <p className="font-semibold text-[var(--color-ink)]">배경</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 py-4 space-y-5">

              {/* 없음 + 책표지 + 사진 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">기본</p>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => { setCardBg("none"); setCardBgUrl(null); }}
                    className={`flex-1 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${cardBg === "none" ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6" : "border-[var(--color-border)]"}`}>
                    <span className="text-xs font-medium text-[var(--color-ink-muted)]">없음</span>
                  </button>
                  {bookCoverUrl && (
                    <button type="button" onClick={() => { setCardBg("cover"); setCardBgUrl(null); }}
                      className={`flex-1 h-14 rounded-2xl overflow-hidden border-2 transition-all relative ${cardBg === "cover" ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bookCoverUrl} alt="책표지" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-end justify-center pb-1"><span className="text-[9px] text-white/80 bg-black/40 px-1.5 rounded-full">책표지</span></span>
                    </button>
                  )}
                  {hasImage && imageUrl && (
                    <button type="button" onClick={() => { setCardBg("photo"); setCardBgUrl(null); }}
                      className={`flex-1 h-14 rounded-2xl overflow-hidden border-2 transition-all relative ${cardBg === "photo" ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="사진" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-end justify-center pb-1"><span className="text-[9px] text-white/80 bg-black/40 px-1.5 rounded-full">사진</span></span>
                    </button>
                  )}
                </div>
              </div>

              {/* 그라디언트 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">그라디언트</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {BG_GRADIENTS.map(({ css, label }) => (
                    <button key={css} type="button" onClick={() => { setCardBg("color"); setCardBgUrl(css); }}
                      className={`h-14 rounded-2xl border-2 transition-all flex items-end justify-center pb-1 ${cardBg === "color" && cardBgUrl === css ? "border-[var(--color-forest)]" : "border-transparent"}`}
                      style={{ background: css }}>
                      <span className="text-[9px] text-white/70">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 사진 업로드 + 큐레이션 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">사진</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {/* 업로드 버튼 */}
                  <button type="button" onClick={() => bgFileInputRef.current?.click()} disabled={bgUploading}
                    className="h-14 rounded-2xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 text-[var(--color-ink-faint)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-all">
                    {bgUploading
                      ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    }
                    <span className="text-[9px]">업로드</span>
                  </button>
                  {/* 큐레이션 */}
                  {PRESET_IMAGES.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.url} src={img.thumb} alt={img.label}
                      onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      className={`h-14 w-full rounded-2xl object-cover cursor-pointer border-2 transition-all ${cardBg === "search" && cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent"}`}
                    />
                  ))}
                  {/* Unsplash 추천 */}
                  {bgLoading
                    ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-2xl bg-[var(--color-cream-dark)] animate-pulse" />)
                    : bgImages.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img.thumb} alt=""
                          onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                          className={`h-14 w-full rounded-2xl object-cover cursor-pointer border-2 transition-all ${cardBg === "search" && cardBgUrl === img.url ? "border-[var(--color-forest)]" : "border-transparent"}`}
                        />
                      ))
                  }
                </div>
              </div>

            </div>
            <div className="h-8" />
          </div>
        </div>
      )}

      {/* ── 모달: 텍스트 ── */}
      {editModal === "font" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setEditModal(null)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <p className="font-semibold text-[var(--color-ink)]">텍스트</p>
              <button type="button" onClick={() => setEditModal(null)} className="text-[var(--color-forest)] font-semibold text-sm">완료</button>
            </div>
            <div className="px-5 pb-8 space-y-4">
              {/* 폰트 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">폰트</p>
                <div className="flex gap-2">
                  {([
                    { value: "serif" as CardFont, label: "명조", cls: "font-serif" },
                    { value: "sans"  as CardFont, label: "고딕", cls: "font-sans"  },
                  ]).map(({ value, label, cls }) => (
                    <button key={value} type="button" onClick={() => setCardFont(value)}
                      className={`flex-1 py-3 rounded-2xl border transition-all ${
                        cardFont === value
                          ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                          : "border-[var(--color-border)] text-[var(--color-ink-muted)]"
                      }`}>
                      <span className={`${cls} text-sm font-medium`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 정렬 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">정렬</p>
                <div className="flex gap-2">
                  {([
                    { value: "left"   as CardAlign, icon: "M4 6h16M4 12h10M4 18h12" },
                    { value: "center" as CardAlign, icon: "M4 6h16M7 12h10M5 18h14" },
                    { value: "right"  as CardAlign, icon: "M4 6h16M10 12h10M8 18h12" },
                  ]).map(({ value, icon }) => (
                    <button key={value} type="button" onClick={() => setCardAlign(value)}
                      className={`flex-1 py-3 rounded-2xl border flex items-center justify-center transition-all ${
                        cardAlign === value
                          ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                          : "border-[var(--color-border)] text-[var(--color-ink-faint)]"
                      }`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d={icon}/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              {/* 위치 (상/중/하) */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">위치</p>
                <div className="flex gap-2">
                  {([
                    { value: "top"    as CardVAlign, label: "상", icon: <><line x1="4" y1="4" x2="20" y2="4"/><rect x="7" y="8" width="10" height="3" rx="1"/><line x1="7" y1="14" x2="17" y2="14"/></> },
                    { value: "center" as CardVAlign, label: "중", icon: <><line x1="7" y1="4" x2="17" y2="4"/><rect x="7" y="10.5" width="10" height="3" rx="1"/><line x1="7" y1="20" x2="17" y2="20"/></> },
                    { value: "bottom" as CardVAlign, label: "하", icon: <><line x1="7" y1="10" x2="17" y2="10"/><rect x="7" y="13" width="10" height="3" rx="1"/><line x1="4" y1="20" x2="20" y2="20"/></> },
                  ]).map(({ value, label, icon }) => (
                    <button key={value} type="button" onClick={() => setCardVAlign(value)}
                      className={`flex-1 py-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        cardVAlign === value
                          ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                          : "border-[var(--color-border)] text-[var(--color-ink-faint)]"
                      }`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{icon}</svg>
                      <span className="text-[11px] font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 애니메이션 */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-ink-faint)]">애니메이션</p>
                <div className="flex gap-2">
                  {([
                    { value: "draw"      as CardAnimation, label: "밑줄",   desc: "선 그리기" },
                    { value: "svg"       as CardAnimation, label: "웨이브", desc: "물결 선"   },
                    { value: "highlight" as CardAnimation, label: "형광펜", desc: "배경 칠하기" },
                  ]).map(({ value, label, desc }) => (
                    <button key={value} type="button" onClick={() => setCardAnimation(value)}
                      className={`flex-1 py-3 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                        cardAnimation === value
                          ? "border-[var(--color-forest)] bg-[var(--color-forest)]/6 text-[var(--color-forest)]"
                          : "border-[var(--color-border)] text-[var(--color-ink-faint)]"
                      }`}>
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-[10px] opacity-60">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
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
