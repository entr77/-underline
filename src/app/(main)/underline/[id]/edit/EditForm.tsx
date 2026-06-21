"use client";
import { useState, useEffect } from "react";
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
  const [bgImages, setBgImages] = useState<{ thumb: string; url: string }[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const cardStyle: CardStyle = cardBg === "photo" ? "photo" : "text";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 이미지 자동 검색
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
      <div className="bg-[#1C1917] px-8 pt-8 pb-2">
        <div className="max-w-[280px] mx-auto pointer-events-none select-none">
          <UnderlineCard underline={previewUnderline} />
        </div>
      </div>

      {/* 배경 선택 스트립 */}
      <div
        className="bg-[#1C1917] overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex gap-2 px-6 py-4 w-max">

          {/* 없음 */}
          <button
            type="button"
            onClick={() => { setCardBg("none"); setCardBgUrl(null); }}
            className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${
              cardBg === "none"
                ? "ring-2 ring-white ring-offset-2 ring-offset-[#1C1917]"
                : "opacity-50 hover:opacity-80"
            }`}
            style={{ background: "#2A2520" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* 사진 */}
          {hasImage && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="사진"
              onClick={() => { setCardBg("photo"); setCardBgUrl(null); }}
              className={`w-14 h-14 rounded-2xl flex-shrink-0 object-cover cursor-pointer transition-all ${
                cardBg === "photo"
                  ? "ring-2 ring-white ring-offset-2 ring-offset-[#1C1917]"
                  : "opacity-50 hover:opacity-80"
              }`}
            />
          )}

          {/* 단색 */}
          {BG_COLORS.map(({ hex }) => (
            <button
              key={hex}
              type="button"
              onClick={() => { setCardBg("color"); setCardBgUrl(hex); }}
              className={`w-14 h-14 rounded-2xl flex-shrink-0 transition-all ${
                cardBg === "color" && cardBgUrl === hex
                  ? "ring-2 ring-white ring-offset-2 ring-offset-[#1C1917]"
                  : "opacity-50 hover:opacity-80"
              }`}
              style={{ background: hex }}
            />
          ))}

          {/* Unsplash 이미지 */}
          {bgLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-14 h-14 rounded-2xl flex-shrink-0 bg-white/10 animate-pulse" />
              ))
            : bgImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.thumb}
                  alt=""
                  onClick={() => { setCardBg("search"); setCardBgUrl(img.url); }}
                  className={`w-14 h-14 rounded-2xl flex-shrink-0 object-cover cursor-pointer transition-all ${
                    cardBg === "search" && cardBgUrl === img.url
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#1C1917]"
                      : "opacity-50 hover:opacity-80"
                  }`}
                />
              ))
          }
        </div>
      </div>

      {/* 편집 옵션 — 다크 섹션 연장 */}
      <div className="bg-[#1C1917] px-6 pb-6 space-y-5 flex-1">

        {/* 구분선 */}
        <div className="border-t border-white/10" />

        {/* 밑줄 문장 */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">밑줄 문장</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm text-white/90 bg-white/8 rounded-xl px-3 py-3 outline-none resize-none leading-relaxed max-h-28 overflow-y-auto placeholder:text-white/30 border border-white/10 focus:border-white/25 transition-colors"
          />
        </div>

        {/* 페이지 번호 + 책 표기 방식 한 줄 */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">페이지</label>
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="—"
              className="w-16 text-base font-medium text-white/90 bg-white/8 rounded-xl px-3 py-2 outline-none placeholder:text-white/30 border border-white/10 focus:border-white/25 transition-colors text-center"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">책 표기</label>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: "full" as DisplayMode,  label: "표지+이름" },
                { value: "cover" as DisplayMode, label: "표지만"   },
                { value: "title" as DisplayMode, label: "이름만"   },
                { value: "none" as DisplayMode,  label: "없음"     },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDisplayMode(value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    displayMode === value
                      ? "bg-white/20 text-white"
                      : "bg-white/6 text-white/45 hover:text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {(displayMode === "title" || displayMode === "full") && (
              <div className="flex gap-1.5 mt-1.5">
                {([
                  { val: true,  label: "저자 표기" },
                  { val: false, label: "안함" },
                ]).map(({ val, label }) => (
                  <button
                    key={String(val)}
                    onClick={() => setShowAuthor(val)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showAuthor === val
                        ? "bg-white/20 text-white"
                        : "bg-white/6 text-white/45 hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </div>
  );
}
