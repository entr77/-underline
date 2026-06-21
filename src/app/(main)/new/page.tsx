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

type BookCandidate = {
  result: {
    title: string;
    author: string;
    publisher: string;
    thumbnail: string;
    isbn: string;
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
  const [bgSearchResults, setBgSearchResults] = useState<{ thumb: string; url: string }[]>([]);
  const [bgSearchLoading, setBgSearchLoading] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [bgSearchQuery, setBgSearchQuery] = useState("");
  const [bgExtractedQuery, setBgExtractedQuery] = useState("");
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
    setBgSearchResults([]);
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

  // book step 진입 시 노출 횟수 기록
  useEffect(() => {
    if (step !== "book") return;
    const stats = getModelStats();
    for (const c of bookCandidates.filter((c) => c.result)) {
      stats[c.model].shown++;
    }
    saveModelStats(stats);
  // bookCandidates가 바뀔 때마다 중복 카운트되지 않도록 step 변경 시만 실행
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
    setCardBg("photo");
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
        contents: validTexts,
        pageNumber: pageNumber ? parseInt(pageNumber) : undefined,
        imageUrl,
        cardStyle,
        bookDisplay,
        cardBg,
        cardBgUrl: cardBgUrl ?? undefined,
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
      <div className="flex flex-col h-full space-y-5">
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 남기기</h1>

        {error && <Alert variant="error">{error}</Alert>}

        <label className="flex-1 min-h-[300px] border-2 border-dashed border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-4 bg-white cursor-pointer hover:border-[var(--color-forest)] transition-colors">
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
            <p className="text-sm text-[var(--color-ink-faint)] mt-1">또는 갤러리에서 선택</p>
          </div>
        </label>
        <p className="text-xs text-center text-[var(--color-ink-faint)]">
          밑줄이 잘 보이게 책을 평평하게 펼쳐서 찍어주세요
        </p>
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

        {/* 배경 선택 버튼 */}
        <div className="flex items-center gap-3">
          <p className="text-xs text-[var(--color-ink-faint)]">카드 배경</p>
          <button
            type="button"
            onClick={async () => {
              setBgModalOpen(true);
              setBgSearchQuery("");
              if (bgSearchResults.length === 0) {
                const sourceText = selectedTexts.find(t => t.trim()) ?? book?.title ?? "";
                if (sourceText) {
                  setBgSearchLoading(true);
                  try {
                    const res = await fetch(`/api/images/search?text=${encodeURIComponent(sourceText.trim())}`);
                    const json = await res.json();
                    setBgSearchResults(json.images ?? []);
                    if (json.query) setBgExtractedQuery(json.query);
                  } finally { setBgSearchLoading(false); }
                }
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-cream-dark)] hover:bg-[var(--color-border)] text-[var(--color-ink-muted)] text-xs transition-all"
          >
            {cardBg === "color" && cardBgUrl ? (
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cardBgUrl }} />
            ) : cardBg === "search" && cardBgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cardBgUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
            ) : cardBg === "photo" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            )}
            {cardBg === "none" ? "없음" : cardBg === "color" ? "단색" : cardBg === "photo" ? "사진" : "이미지"}
          </button>
        </div>

        {/* 통합 배경 선택 모달 */}
        {bgModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setBgModalOpen(false)}>
            <div className="w-full bg-white rounded-t-3xl max-h-[82vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                <p className="font-semibold text-[var(--color-ink)]">배경 선택</p>
                <button onClick={() => setBgModalOpen(false)} className="text-[var(--color-ink-faint)]">
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
                  {imagePreview && (
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[var(--color-ink-faint)]">이미지 검색</p>
                    {bgExtractedQuery && !bgSearchLoading && bgSearchResults.length > 0 && (
                      <span className="text-[10px] text-[var(--color-ink-faint)] bg-[var(--color-cream-dark)] px-2 py-0.5 rounded-full">
                        AI: {bgExtractedQuery}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={bgSearchQuery}
                      onChange={(e) => setBgSearchQuery(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && bgSearchQuery.trim()) {
                          setBgSearchLoading(true);
                          setBgSearchResults([]);
                          try {
                            const res = await fetch(`/api/images/search?q=${encodeURIComponent(bgSearchQuery.trim())}`);
                            const json = await res.json();
                            setBgSearchResults(json.images ?? []);
                          } finally { setBgSearchLoading(false); }
                        }
                      }}
                      placeholder="다른 키워드로 검색..."
                      className="flex-1 bg-[var(--color-cream)] rounded-xl px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
                    />
                    <button
                      type="button"
                      disabled={bgSearchLoading || !bgSearchQuery.trim()}
                      onClick={async () => {
                        if (!bgSearchQuery.trim()) return;
                        setBgSearchLoading(true);
                        setBgSearchResults([]);
                        try {
                          const res = await fetch(`/api/images/search?q=${encodeURIComponent(bgSearchQuery.trim())}`);
                          const json = await res.json();
                          setBgSearchResults(json.images ?? []);
                        } finally { setBgSearchLoading(false); }
                      }}
                      className="px-4 py-2 bg-[var(--color-forest)] text-white text-sm rounded-xl font-medium disabled:opacity-40"
                    >
                      검색
                    </button>
                  </div>
                  {bgSearchLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-ink-faint)]">
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span className="text-sm">이미지 찾는 중…</span>
                    </div>
                  ) : bgSearchResults.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {bgSearchResults.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img.thumb}
                          alt=""
                          onClick={() => { setCardBg("search"); setCardBgUrl(img.url); setBgModalOpen(false); }}
                          className={`w-full aspect-square object-cover rounded-lg cursor-pointer transition-all ${
                            cardBg === "search" && cardBgUrl === img.url ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : "opacity-90 hover:opacity-100"
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
            <div className="flex gap-2">
              <button
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

        <button
          onClick={() => {
            if (selectedModel) {
              const stats = getModelStats();
              stats[selectedModel].selected++;
              saveModelStats(stats);
            }
            setStep("select");
          }}
          disabled={!book}
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
                    prev.map((t, idx) => (idx === i ? e.target.value : t))
                  )
                }
                placeholder="밑줄 친 문장을 입력하세요"
                rows={3}
                className="w-full font-serif text-sm text-[var(--color-ink)] bg-transparent outline-none resize-none placeholder:text-[var(--color-ink-faint)] leading-relaxed"
              />
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
