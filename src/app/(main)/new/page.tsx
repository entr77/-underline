"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Link from "next/link";
import Image from "next/image";
import BookSearchInput, { type KakaoBook } from "@/components/features/BookSearchInput";
import ImageCropRotate from "@/components/features/ImageCropRotate";
import { imageFileToBase64, uploadImage } from "@/lib/storage";
import { createUnderlinesBulk } from "@/app/actions/underline";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/types";

type Step = "upload" | "crop" | "processing" | "book" | "select" | "done";

type CardStyle = "photo" | "text";
type BookDisplay = "none" | "cover" | "title" | "title-author" | "full" | "full-author";
type DisplayMode = "none" | "cover" | "title" | "full";
type CardBg = "cover" | "photo" | "search" | "color" | "none";
type CardFont = "serif" | "sans";
type CardAlign = "left" | "center" | "right";

const MAX_CONTENT = 300;

type ThemeId = "book" | "dark" | "gradient" | "photo" | "scene";

type ThemePreset = {
  id: ThemeId;
  label: string;
  desc: string;
  cardBg: CardBg;
  cardBgUrl?: string;
  cardFont: CardFont;
  cardAlign: CardAlign;
  displayMode: DisplayMode;
  showAuthor: boolean;
};

const BG_GRADIENTS = [
  { css: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", label: "달빛" },
  { css: "linear-gradient(160deg, #2d0845 0%, #5c1e91 50%, #c2185b 100%)", label: "새벽" },
  { css: "linear-gradient(160deg, #0a0a2e 0%, #003973 50%, #005c97 100%)", label: "심해" },
  { css: "linear-gradient(160deg, #4b134f 0%, #c94b4b 100%)",             label: "장미" },
];

const THEMES: ThemePreset[] = [
  { id: "book",     label: "북카드",    desc: "책표지 배경",  cardBg: "cover",  cardFont: "serif", cardAlign: "center", displayMode: "full",  showAuthor: false },
  { id: "dark",     label: "다크",      desc: "어두운 배경",  cardBg: "color",  cardBgUrl: "#1C1917",           cardFont: "serif", cardAlign: "left",   displayMode: "title", showAuthor: false },
  { id: "gradient", label: "그라디언트", desc: "컬러 배경",   cardBg: "color",  cardBgUrl: BG_GRADIENTS[0].css, cardFont: "serif", cardAlign: "center", displayMode: "title", showAuthor: false },
  { id: "photo",    label: "포토",      desc: "사진 배경",   cardBg: "photo",  cardFont: "serif", cardAlign: "left",   displayMode: "cover", showAuthor: false },
  { id: "scene",    label: "풍경",      desc: "감성 배경",   cardBg: "search", cardFont: "serif", cardAlign: "center", displayMode: "title", showAuthor: false },
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

type BookCandidate = {
  result: {
    title: string;
    author: string;
    publisher: string;
    thumbnail: string;
    isbn: string;
    genre?: string;
    strategy: string;
  } | null;
  model: "gpt" | "claude" | "gemini";
};

type AnalyzeResult = {
  fullText: string;
  detectedUnderlineRanges: { start: number; end: number }[];
  pageNumber: string | null;
  headerText?: string;
  book?: {
    title: string;
    author: string;
    publisher: string;
    thumbnail: string;
    isbn: string;
    genre?: string;
  } | null;
  bookCandidates?: BookCandidate[];
};

// 모델별 노출/선택 통계 (localStorage)
type ModelKey = "gpt" | "claude" | "gemini";
type ModelStats = Record<ModelKey, { shown: number; selected: number }>;

function getModelStats(): ModelStats {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("book_model_stats") : null;
    if (raw) return JSON.parse(raw) as ModelStats;
  } catch {}
  return { gpt: { shown: 0, selected: 0 }, claude: { shown: 0, selected: 0 }, gemini: { shown: 0, selected: 0 } };
}

function saveModelStats(stats: ModelStats) {
  try { localStorage.setItem("book_model_stats", JSON.stringify(stats)); } catch {}
}

function modelLabel(model: ModelKey, stats: ModelStats): string {
  const name = model === "gpt" ? "GPT-4o" : model === "gemini" ? "Gemini" : "Claude";
  const s = stats[model];
  if (s.shown >= 3) {
    const pct = Math.round((s.selected / s.shown) * 100);
    return `${name} ${pct}%`;
  }
  return name;
}

const STEP_LABELS = ["사진", "읽기", "책", "문장"];
const DISPLAY_STEPS: Step[] = ["upload", "processing", "book", "select"];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = DISPLAY_STEPS.indexOf(current);
  return (
    <div className="flex items-center">
      {DISPLAY_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
              i < currentIndex ? "bg-[var(--color-forest)] text-white" :
              i === currentIndex ? "bg-[var(--color-forest)] text-white ring-2 ring-[var(--color-forest)] ring-offset-2" :
              "bg-[var(--color-border)] text-[var(--color-ink-faint)]"
            }`}>
              {i < currentIndex
                ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                : i + 1}
            </div>
            <span className={`text-[9px] mt-0.5 ${i === currentIndex ? "text-[var(--color-forest)] font-medium" : "text-[var(--color-ink-faint)]"}`}>
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < DISPLAY_STEPS.length - 1 && (
            <div className={`w-7 h-px mb-3 mx-1 transition-colors ${i < currentIndex ? "bg-[var(--color-forest)]" : "bg-[var(--color-border)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewUnderlinePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [processingMsg, setProcessingMsg] = useState("페이지 위의 문자들을 읽고 있어요");
  const [book, setBook] = useState<Book | null>(null);
  const [pageNumber, setPageNumber] = useState("");
  const [selectedTexts, setSelectedTexts] = useState<string[]>([""]);
  const [bookCandidates, setBookCandidates] = useState<BookCandidate[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelKey | null>(null);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [showAuthor, setShowAuthor] = useState(false);
  const [cardBg, setCardBg] = useState<CardBg>("none");
  const [cardBgUrl, setCardBgUrl] = useState<string | null>(null);
  const [bgImages, setBgImages] = useState<{ thumb: string; url: string }[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [cardFont, setCardFont] = useState<CardFont>("serif");
  const [cardAlign, setCardAlign] = useState<CardAlign>("center");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("book");

  function applyTheme(themeId: ThemeId) {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setSelectedTheme(theme.id);
    setCardBg(theme.cardBg);
    setCardBgUrl(theme.cardBgUrl ?? null);
    setCardFont(theme.cardFont);
    setCardAlign(theme.cardAlign);
    setDisplayMode(theme.displayMode);
    setShowAuthor(theme.showAuthor);
  }

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
  const bookDisplay: BookDisplay = displayMode === "none" || displayMode === "cover"
    ? displayMode
    : showAuthor ? `${displayMode}-author` as BookDisplay : displayMode as BookDisplay;
  const cardStyle: CardStyle = cardBg === "photo" ? "photo" : "text";
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const resetToUpload = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalyzeResult(null);
    setBook(null);
    setBookCandidates([]);
    setSelectedModel(null);
    setPageNumber("");
    setSelectedTexts([""]);
    setDisplayMode("full");
    setShowAuthor(false);
    setCardBg("cover");
    setCardBgUrl(null);
    setBgImages([]);
    setSelectedTheme("book");
    setError(null);
    setStep("upload");
  }, []);

  // 최근에 저장한 책 (최대 2권) — 같은 책 읽는 중일 확률 높음
  useEffect(() => {
    const fetchRecentBooks = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      type Row = { book_id: string | null; books: { id: string; kakao_id: string; title: string; author: string; publisher: string | null; cover_url: string | null } | null };
      const { data } = await supabase
        .from("underlines")
        .select("book_id, books(id, kakao_id, title, author, publisher, cover_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20) as { data: Row[] | null; error: unknown };
      if (!data) return;
      const seen = new Set<string>();
      const books: Book[] = [];
      for (const row of data) {
        if (!row.book_id || !row.books) continue;
        if (seen.has(row.book_id)) continue;
        seen.add(row.book_id);
        const b = row.books;
        books.push({ id: b.id, kakao_id: b.kakao_id, title: b.title, author: b.author, publisher: b.publisher ?? "", cover_url: b.cover_url ?? "" });
        if (books.length >= 2) break;
      }
      setRecentBooks(books);
    };
    fetchRecentBooks();
  }, []);

  // book step 진입 시 노출 횟수 기록 + 배경 이미지 자동 검색
  useEffect(() => {
    if (step !== "book") return;

    const stats = getModelStats();
    for (const c of bookCandidates.filter((c) => c.result)) {
      stats[c.model].shown++;
    }
    saveModelStats(stats);

    if (bgImages.length > 0) return;
    const src = selectedTexts.find((t) => t.trim()) ?? book?.title ?? analyzeResult?.headerText ?? "";
    if (!src) return;
    setBgLoading(true);
    fetch(`/api/images/search?text=${encodeURIComponent(src.trim())}`)
      .then((r) => r.json())
      .then((json) => setBgImages(json.images ?? []))
      .catch(() => {})
      .finally(() => setBgLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const processImage = useCallback(async (file: File) => {
    setStep("processing");
    setError(null);

    try {
      setProcessingMsg("페이지 위의 문자들을 읽고 있어요");
      const base64 = await imageFileToBase64(file);

      const msgs = ["당신이 멈춘 자리를 찾고 있어요", "이 문장이 어느 책에서 왔는지 확인해요", "밑줄 위의 감정을 읽고 있어요"];
      let msgIdx = 0;
      const msgTimer = setInterval(() => {
        msgIdx = (msgIdx + 1) % msgs.length;
        setProcessingMsg(msgs[msgIdx]);
      }, 2500);

      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      clearInterval(msgTimer);

      if (!res.ok) {
        setAnalyzeResult({ fullText: "", detectedUnderlineRanges: [], pageNumber: null });
        setSelectedTexts([""]);
      } else {
        const data: AnalyzeResult = await res.json();
        setAnalyzeResult(data);
        if (data.pageNumber) setPageNumber(data.pageNumber);

        // 감지된 모든 밑줄 범위를 텍스트 배열로 변환
        const texts = (data.detectedUnderlineRanges ?? [])
          .map(({ start, end }) => data.fullText.slice(start, end).trim())
          .filter(Boolean);
        setSelectedTexts(texts.length > 0 ? texts : [""]);

        setBookCandidates(data.bookCandidates ?? []);

        if (data.book) {
          setBook({
            id: "",
            kakao_id: data.book.isbn || data.book.title,
            title: data.book.title,
            author: data.book.author,
            publisher: data.book.publisher ?? "",
            cover_url: data.book.thumbnail ?? "",
            genre: data.book.genre,
          });
        }
      }

      setStep("book");
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했어요");
      setStep("upload");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    applyTheme("photo");
    setStep("crop");
  };

  const handleSave = async () => {
    const validTexts = selectedTexts.filter((t) => t.trim());
    if (!book || validTexts.length === 0) return;
    setIsSaving(true);
    setError(null);
    setUploadWarning(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let imageUrl: string | undefined;
      if (imageFile && user) {
        try {
          imageUrl = await uploadImage(imageFile, user.id);
        } catch (uploadErr) {
          console.error("[uploadImage] 스토리지 업로드 실패:", uploadErr);
          setUploadWarning("사진은 저장되지 않았어요. 문장만 남겨요.");
        }
      }

      const result = await createUnderlinesBulk({
        bookKakaoId: book.kakao_id,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookPublisher: book.publisher,
        bookCoverUrl: book.cover_url,
        bookGenre: book.genre,
        contents: validTexts,
        pageNumber: pageNumber ? parseInt(pageNumber) : undefined,
        imageUrl,
        cardStyle,
        bookDisplay,
        cardBg,
        cardBgUrl: cardBgUrl ?? undefined,
        cardFont,
        cardAlign,
      });

      if (result && "error" in result) {
        setError(result.error as string);
      } else if (result && "ids" in result) {
        const ids = result.ids as string[];
        router.push(ids.length === 1 ? `/underline/${ids[0]}` : "/feed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Upload step ────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="flex flex-col h-full space-y-4">
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 남기기</h1>

        {error && <Alert variant="error">{error}</Alert>}

        <label className="flex-1 min-h-[220px] border-2 border-dashed border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-4 bg-white cursor-pointer hover:border-[var(--color-forest)] transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-14 h-14 rounded-full bg-[var(--color-cream-dark)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-forest)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-[var(--color-ink)]">책 페이지 사진 찍기</p>
            <p className="text-sm text-[var(--color-ink-faint)] mt-1">밑줄을 자동으로 인식해요</p>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-ink-faint)]">또는</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        <button
          onClick={() => {
            setSelectedTexts([""]);
            setCardBg("cover");
            setStep("book");
          }}
          className="w-full py-4 rounded-2xl border border-[var(--color-border)] bg-white flex items-center justify-center gap-3 text-[var(--color-ink-muted)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="font-medium">기억나는 문장 직접 입력</span>
        </button>
      </div>
    );
  }

  // ─── Crop / rotate step ──────────────────────────────────────────────────────
  if (step === "crop" && imagePreview) {
    return (
      <div className="space-y-5">
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 기록</h1>
        <ImageCropRotate
          src={imagePreview}
          onConfirm={(croppedFile) => {
            setImageFile(croppedFile);
            setImagePreview(URL.createObjectURL(croppedFile));
            processImage(croppedFile);
          }}
          onCancel={resetToUpload}
        />
      </div>
    );
  }

  // ─── Processing step ─────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        {imagePreview && (
          <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-[var(--color-border)] opacity-60">
            <Image src={imagePreview} alt="업로드 이미지" fill className="object-cover" />
          </div>
        )}
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
        <p className="font-serif text-lg text-[var(--color-ink)]">{processingMsg}</p>
      </div>
    );
  }

  // ─── Book step ───────────────────────────────────────────────────────────────
  if (step === "book") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("upload")} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <StepIndicator current="book" />
          <button onClick={resetToUpload} className="ml-auto text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
            다시 찍기
          </button>
        </div>

        <h2 className="font-serif text-xl text-[var(--color-ink)]">이 책이 맞나요?</h2>

        {(() => {
          const aiBooks = bookCandidates.filter((c) => c.result);
          // AI 후보 제목 목록 (소문자 비교용)
          const aiTitles = new Set(aiBooks.map((c) => c.result!.title.toLowerCase().trim()));
          // 최근 책 중 AI 후보에 없는 것만 별도 섹션으로
          const recentOnly = recentBooks.filter((rb) => !aiTitles.has(rb.title.toLowerCase().trim()));
          // AI 후보 중 최근 책과 일치하는 것에 배지 표시
          const recentTitles = new Set(recentBooks.map((rb) => rb.title.toLowerCase().trim()));
          const hasAnySuggestion = recentOnly.length > 0 || aiBooks.length > 0;

          const BookCard = ({
            thumbnail, title, author, isSelected, onClick, badge, badgeStyle,
          }: {
            thumbnail?: string; title: string; author: string; isSelected: boolean;
            onClick: () => void; badge?: string; badgeStyle?: string;
          }) => (
            <button
              onClick={onClick}
              className={`w-full flex gap-3 items-center p-3 rounded-2xl border transition-colors text-left ${
                isSelected
                  ? "border-[var(--color-forest)] bg-[var(--color-forest)]/5"
                  : "border-[var(--color-border)] bg-white hover:border-[var(--color-forest)]/50"
              }`}
            >
              {thumbnail ? (
                <div className="relative w-10 h-14 flex-shrink-0">
                  <Image src={thumbnail} alt={title} fill className="object-cover rounded" />
                </div>
              ) : (
                <div className="w-10 h-14 bg-[var(--color-forest)] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-white/60 text-[9px] text-center px-1 leading-tight">{title.slice(0, 6)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-[var(--color-ink)]">{title}</p>
                <p className="text-xs text-[var(--color-ink-faint)]">{author}</p>
              </div>
              {badge && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${badgeStyle ?? "bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)]"}`}>
                  {badge}
                </span>
              )}
            </button>
          );

          const stats = getModelStats();

          return (
            <>
              {/* 최근 읽던 책 (AI 후보와 중복 아닌 것) */}
              {recentOnly.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-ink-faint)]">계속 읽고 있나요?</p>
                  {recentOnly.map((rb, i) => (
                    <BookCard
                      key={`recent-${i}`}
                      thumbnail={rb.cover_url}
                      title={rb.title}
                      author={rb.author}
                      isSelected={book?.title === rb.title}
                      onClick={() => { setBook(rb); setSelectedModel(null); }}
                      badge="최근"
                      badgeStyle="bg-amber-50 text-amber-700"
                    />
                  ))}
                </div>
              )}

              {/* AI 후보 */}
              {aiBooks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-ink-faint)]">AI가 찾은 책</p>
                  {aiBooks.map((c, i) => {
                    const isRecent = recentTitles.has(c.result!.title.toLowerCase().trim());
                    const badge = isRecent ? "지금 읽는 중" : modelLabel(c.model, stats);
                    return (
                      <BookCard
                        key={`ai-${i}`}
                        thumbnail={c.result!.thumbnail}
                        title={c.result!.title}
                        author={c.result!.author}
                        isSelected={book?.title === c.result!.title}
                        onClick={() => {
                          setBook({
                            id: "",
                            kakao_id: c.result!.isbn || c.result!.title,
                            title: c.result!.title,
                            author: c.result!.author,
                            publisher: c.result!.publisher ?? "",
                            cover_url: c.result!.thumbnail ?? "",
                            genre: c.result!.genre,
                          });
                          setSelectedModel(c.model);
                        }}
                        badge={badge}
                        badgeStyle={isRecent ? "bg-amber-50 text-amber-700" : "bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)]"}
                      />
                    );
                  })}
                </div>
              )}

              {/* 직접 검색 */}
              <div>
                <p className="text-sm text-[var(--color-ink-muted)] mb-2">
                  {hasAnySuggestion ? "다른 책이면 직접 검색" : "책 제목이나 저자로 검색해주세요"}
                </p>
                <BookSearchInput onSelect={(b: KakaoBook) => setBook({
                  id: b.kakao_id,
                  kakao_id: b.kakao_id,
                  title: b.title,
                  author: b.author,
                  publisher: b.publisher,
                  cover_url: b.cover_url,
                  genre: b.genre,
                })} />
              </div>
            </>
          );
        })()}

        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--color-ink-faint)]">페이지 번호</label>
            <span className="text-[10px] text-[var(--color-ink-faint)]">입력하면 나중에 찾기 쉬워요</span>
          </div>
          <input
            type="number"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="예: 112"
            className="w-full text-lg font-medium text-[var(--color-ink)] bg-transparent outline-none placeholder:text-[var(--color-ink-faint)]"
          />
        </div>

        {/* 카드 테마 */}
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-ink-faint)]">카드 테마</p>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              let bgStyle: React.CSSProperties;
              if (theme.id === "book") {
                bgStyle = book?.cover_url
                  ? { backgroundImage: `url(${book.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "#1a1a1a" };
              } else if (theme.id === "dark") {
                bgStyle = { background: "#1C1917" };
              } else if (theme.id === "gradient") {
                bgStyle = { background: isSelected ? (cardBgUrl ?? BG_GRADIENTS[0].css) : BG_GRADIENTS[0].css };
              } else if (theme.id === "photo") {
                bgStyle = imagePreview
                  ? { backgroundImage: `url(${imagePreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "#2a2a2a" };
              } else {
                bgStyle = bgImages[0]
                  ? { backgroundImage: `url(${bgImages[0].thumb})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "linear-gradient(135deg, #1a2a3a 0%, #2d4a3a 100%)" };
              }
              return (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id)}
                  className={`flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected ? "border-[var(--color-forest)]" : "border-[var(--color-border)]"
                  }`}
                >
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
        </div>

        {/* 저자 표기 (테마에 책제목이 포함될 때) */}
        {(displayMode === "title" || displayMode === "full") && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-ink-faint)]">저자 표기</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowAuthor(true)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  showAuthor ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]" : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
                }`}
              >표기</button>
              <button
                onClick={() => setShowAuthor(false)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  !showAuthor ? "border-[var(--color-forest)] bg-[var(--color-forest)]/8 text-[var(--color-forest)]" : "border-[var(--color-border)] bg-white text-[var(--color-ink-muted)]"
                }`}
              >안함</button>
            </div>
          </div>
        )}

        {/* 테마별 추가 설정 */}
        {selectedTheme === "gradient" && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-ink-faint)]">색상 선택</p>
            <div className="flex gap-2">
              {BG_GRADIENTS.map(({ css, label }) => (
                <button
                  key={css}
                  type="button"
                  onClick={() => setCardBgUrl(css)}
                  className={`flex-1 h-12 rounded-xl border-2 flex items-end pb-1.5 pl-2 transition-all ${
                    cardBgUrl === css ? "border-[var(--color-forest)]" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  style={{ background: css }}
                >
                  <span className="text-[9px] text-white/80 font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTheme === "photo" && !imagePreview && (
          <div className="space-y-2">
            <Alert variant="warning">포토 테마는 사진이 필요해요</Alert>
            <label className="w-full py-3.5 rounded-xl border-2 border-dashed border-[var(--color-border)] flex items-center justify-center gap-2 text-[var(--color-ink-muted)] cursor-pointer hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm font-medium">사진 업로드하기</span>
            </label>
          </div>
        )}

        {selectedTheme === "scene" && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-ink-faint)]">
              배경 사진 선택
              {!cardBgUrl && <span className="text-amber-500 ml-1">· 사진을 골라주세요</span>}
            </p>
            <div className="overflow-x-auto -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 pb-1 w-max">
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={bgUploading}
                  className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-dashed border-[var(--color-border)] text-[var(--color-ink-faint)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-all"
                >
                  {bgUploading
                    ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  }
                </button>
                <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgFileChange} />

                <div className="w-px self-stretch my-2 bg-[var(--color-border)] flex-shrink-0" />

                {PRESET_IMAGES.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.url}
                    src={img.thumb}
                    alt={img.label}
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
                      <img
                        key={i}
                        src={img.thumb}
                        alt=""
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

        <button
          onClick={() => {
            if (selectedModel) {
              const stats = getModelStats();
              stats[selectedModel].selected++;
              saveModelStats(stats);
            }
            setStep("select");
          }}
          disabled={!book || (selectedTheme === "photo" && !imagePreview) || (selectedTheme === "scene" && !cardBgUrl)}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          밑줄 확인하기
        </button>

        {isImageZoomed && imagePreview && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setIsImageZoomed(false)}
          >
            <div className="relative w-full h-full">
              <Image src={imagePreview} alt="촬영 이미지 전체" fill className="object-contain" />
            </div>
            <button
              type="button"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsImageZoomed(false); }}
              aria-label="닫기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Select step ─────────────────────────────────────────────────────────────
  if (step === "select") {
    const validCount = selectedTexts.filter((t) => t.trim()).length;
    const fullText = analyzeResult?.fullText ?? "";

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("book")} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <StepIndicator current="select" />
        </div>

        <h2 className="font-serif text-xl text-[var(--color-ink)]">어떤 문장을 남길까요?</h2>

        {/* OCR 텍스트 절 선택기 — fullText가 있을 때만 표시 */}
        {fullText && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-ink-faint)]">문장을 눌러 밑줄 구간을 선택하세요</p>
            <OcrClauseSelector
              fullText={fullText}
              initialTexts={selectedTexts}
              onSelect={setSelectedTexts}
            />
          </div>
        )}

        {/* 선택된 밑줄 카드 목록 */}
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-ink-faint)]">
            남길 문장{validCount > 0 ? ` ${validCount}개` : ""} · 직접 고칠 수 있어요
          </p>
          {selectedTexts.map((text, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--color-ink-faint)]">{i + 1}</span>
                <button
                  onClick={() =>
                    setSelectedTexts((prev) =>
                      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [""]
                    )
                  }
                  className="text-[var(--color-ink-faint)] hover:text-red-400 transition-colors"
                  aria-label="삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) =>
                  setSelectedTexts((prev) =>
                    prev.map((t, idx) => (idx === i ? e.target.value.slice(0, MAX_CONTENT) : t))
                  )
                }
                placeholder="밑줄 친 문장을 입력하세요"
                rows={3}
                maxLength={MAX_CONTENT}
                className="w-full font-serif text-sm text-[var(--color-ink)] bg-transparent outline-none resize-none placeholder:text-[var(--color-ink-faint)] leading-relaxed"
              />
              <p className={`text-right text-xs mt-1 ${text.length >= MAX_CONTENT ? "text-red-400" : "text-[var(--color-ink-faint)]"}`}>
                {text.length}/{MAX_CONTENT}
              </p>
            </div>
          ))}

          <button
            onClick={() => setSelectedTexts((prev) => [...prev, ""])}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-ink-faint)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)] transition-colors"
          >
            + 밑줄 추가
          </button>
        </div>

        {uploadWarning && <Alert variant="warning">{uploadWarning}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <button
          onClick={handleSave}
          disabled={validCount === 0 || isSaving}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving
            ? "남기는 중..."
            : validCount === 1
            ? "이 문장 남기기"
            : `${validCount}개 문장 남기기`}
        </button>
      </div>
    );
  }

  // ─── Done step ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--color-forest)] flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div>
        <p className="font-serif text-xl text-[var(--color-ink)]">문장이 남았어요</p>
        {book && <p className="text-sm text-[var(--color-ink-faint)] mt-1">{book.title}{pageNumber ? ` · p.${pageNumber}` : ""}</p>}
      </div>
      <div className="flex flex-col gap-3 w-full mt-2">
        <button
          onClick={resetToUpload}
          className="block w-full py-3.5 rounded-2xl border border-[var(--color-forest)] text-[var(--color-forest)] font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors"
        >
          다른 밑줄 남기기
        </button>
        <Link
          href="/feed"
          className="block w-full py-3.5 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] transition-colors"
        >
          다른 밑줄 읽어보기
        </Link>
      </div>
    </div>
  );
}

// OCR 텍스트를 마침표/쉼표 단위 절로 분리해 클릭 선택하는 컴포넌트.
// 연속된 절은 하나의 텍스트로 합쳐 cards에 전달하고, 떨어진 절은 별도 텍스트로 분리.
function OcrClauseSelector({
  fullText,
  initialTexts,
  onSelect,
}: {
  fullText: string;
  initialTexts: string[];
  onSelect: (texts: string[]) => void;
}) {
  const normalized = fullText.replace(/\n+/g, " ").replace(/  +/g, " ").trim();
  const clauses = normalized
    .split(/(?<=[.!?。,，])\s*/)
    .map((c) => c.trim())
    .filter((c) => c.length > 1);

  const normalizedInitials = initialTexts
    .filter((t) => t.trim())
    .map((t) => t.replace(/\n+/g, " ").replace(/  +/g, " ").trim());

  const [selectedSet, setSelectedSet] = useState<Set<number>>(() => {
    const init = new Set<number>();
    clauses.forEach((c, i) => {
      if (normalizedInitials.some((t) => t.includes(c))) init.add(i);
    });
    return init;
  });

  const [dragAnchor, setDragAnchor] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dragMin = dragAnchor !== null && dragEnd !== null ? Math.min(dragAnchor, dragEnd) : null;
  const dragMax = dragAnchor !== null && dragEnd !== null ? Math.max(dragAnchor, dragEnd) : null;

  function getIdxFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y);
    const span = el?.closest("[data-cidx]");
    const v = span?.getAttribute("data-cidx");
    return v != null ? Number(v) : null;
  }

  function groupConsecutive(set: Set<number>): string[] {
    const sorted = Array.from(set).sort((a, b) => a - b);
    if (!sorted.length) return [];
    const groups: number[][] = [];
    let group = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) group.push(sorted[i]);
      else { groups.push(group); group = [sorted[i]]; }
    }
    groups.push(group);
    return groups.map((g) => g.map((idx) => clauses[idx]).join(" "));
  }

  function commitDrag(anchor: number, end: number) {
    const min = Math.min(anchor, end);
    const max = Math.max(anchor, end);
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (min === max && prev.has(min)) {
        next.delete(min); // 단일 탭: 이미 선택된 것 토글
      } else {
        for (let i = min; i <= max; i++) next.add(i);
      }
      const texts = groupConsecutive(next);
      onSelect(texts.length > 0 ? texts : [""]);
      return next;
    });
  }

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl p-5 border border-[var(--color-border)] select-none touch-none"
      onPointerDown={(e) => {
        const idx = getIdxFromPoint(e.clientX, e.clientY);
        if (idx === null) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragAnchor(idx);
        setDragEnd(idx);
      }}
      onPointerMove={(e) => {
        if (dragAnchor === null) return;
        const idx = getIdxFromPoint(e.clientX, e.clientY);
        if (idx !== null) setDragEnd(idx);
      }}
      onPointerUp={() => {
        if (dragAnchor === null) return;
        commitDrag(dragAnchor, dragEnd ?? dragAnchor);
        setDragAnchor(null);
        setDragEnd(null);
      }}
      onPointerCancel={() => { setDragAnchor(null); setDragEnd(null); }}
    >
      {clauses.map((c, i) => {
        const isSelected = selectedSet.has(i);
        const inDrag = dragMin !== null && dragMax !== null && i >= dragMin && i <= dragMax;
        return (
          <span
            key={i}
            data-cidx={String(i)}
            className={`inline cursor-pointer rounded px-0.5 font-serif text-sm leading-relaxed transition-colors ${
              isSelected
                ? "bg-[var(--color-highlight)] underline decoration-2 decoration-amber-400 text-[var(--color-ink)] font-medium"
                : inDrag
                ? "bg-amber-200/60"
                : "hover:bg-[var(--color-cream-dark)]"
            }`}
          >
            {c}{" "}
          </span>
        );
      })}
    </div>
  );
}
