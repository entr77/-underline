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

type CardStyle = "classic" | "dark" | "forest";

const CARD_STYLES: { id: CardStyle; label: string; desc: string; bg: string; text: string; quote: string }[] = [
  { id: "classic", label: "크림", desc: "따뜻한", bg: "#F7F3EE", text: "#1C1917", quote: "#1E3A2F" },
  { id: "dark", label: "다크", desc: "깊은 밤", bg: "#1C1917", text: "#F7F3EE", quote: "#A8A29E" },
  { id: "forest", label: "숲", desc: "고요한", bg: "#1E3A2F", text: "#F7F3EE", quote: "#2D5A3D" },
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
  const [cardStyle, setCardStyle] = useState<CardStyle>("classic");
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
    setCardStyle("classic");
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

        {/* 카드 스타일 */}
        <div>
          <p className="text-xs text-[var(--color-ink-faint)] mb-2">카드 스타일</p>
          <div className="flex gap-2">
            {CARD_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setCardStyle(s.id)}
                className={`flex-1 rounded-xl p-0.5 transition-all ${cardStyle === s.id ? "ring-2 ring-[var(--color-forest)] ring-offset-1" : ""}`}
              >
                {/* 미니 카드 프리뷰 */}
                <div
                  className="rounded-[10px] p-2.5 flex flex-col justify-between h-20"
                  style={{ backgroundColor: s.bg }}
                >
                  <span className="text-[18px] leading-none font-serif" style={{ color: s.quote, opacity: 0.4 }}>"</span>
                  <div>
                    <div className="h-[3px] rounded-full w-full mb-1" style={{ backgroundColor: s.text, opacity: 0.25 }} />
                    <div className="h-[3px] rounded-full w-3/4" style={{ backgroundColor: s.text, opacity: 0.15 }} />
                  </div>
                </div>
                <p className="text-[11px] text-center mt-1 text-[var(--color-ink-muted)]">{s.label}</p>
              </button>
            ))}
          </div>
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
