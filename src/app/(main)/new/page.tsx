"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Link from "next/link";
import Image from "next/image";
import BookSearchInput, { type KakaoBook } from "@/components/features/BookSearchInput";
import { imageFileToBase64, uploadImage } from "@/lib/storage";
import { createUnderlinesBulk } from "@/app/actions/underline";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/types";

type Step = "upload" | "processing" | "book" | "select" | "done";

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
};

const STEP_LABELS = ["사진", "인식", "책", "밑줄"];
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const resetToUpload = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalyzeResult(null);
    setBook(null);
    setPageNumber("");
    setSelectedTexts([""]);
    setError(null);
    setStep("upload");
  }, []);

  const processImage = useCallback(async (file: File) => {
    setStep("processing");
    setError(null);

    try {
      setProcessingMsg("페이지 위의 문자들을 읽고 있어요");
      const base64 = await imageFileToBase64(file);

      const msgs = ["당신이 멈춘 자리를 찾고 있어요", "이 문장이 어느 책에서 왔는지 확인해요"];
      let msgIdx = 0;
      const msgTimer = setInterval(() => {
        msgIdx = (msgIdx + 1) % msgs.length;
        setProcessingMsg(msgs[msgIdx]);
      }, 1200);

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
    processImage(file);
  };

  const handleSave = async () => {
    const validTexts = selectedTexts.filter((t) => t.trim());
    if (!book || validTexts.length === 0) return;
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let imageUrl: string | undefined;
      if (imageFile && user) {
        try {
          imageUrl = await uploadImage(imageFile, user.id);
        } catch {
          // 스토리지 실패해도 텍스트만으로 저장
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
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 기록</h1>

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
          밑줄 친 부분이 잘 보이도록 평평하게 펴서 찍어주세요
        </p>
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
        </div>

        <h2 className="font-serif text-xl text-[var(--color-ink)]">이 책이 맞나요?</h2>

        {imagePreview && (
          <div className="relative">
            <button
              type="button"
              className="relative w-full h-36 rounded-xl overflow-hidden border border-[var(--color-border)] block cursor-zoom-in group"
              onClick={() => setIsImageZoomed(true)}
              aria-label="사진 확대"
            >
              <Image src={imagePreview} alt="촬영 이미지" fill className="object-cover" />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={resetToUpload}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
              aria-label="사진 다시 찍기"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {book ? (
          <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] flex gap-3 items-center">
            {book.cover_url ? (
              <div className="relative w-12 h-16 flex-shrink-0">
                <Image src={book.cover_url} alt={book.title} fill className="object-cover rounded" />
              </div>
            ) : (
              <div className="w-12 h-16 bg-[var(--color-forest)] rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white/60 text-[10px] text-center px-1 leading-tight">{book.title}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--color-ink)] truncate">{book.title}</p>
              <p className="text-sm text-[var(--color-ink-faint)]">{book.author}{book.publisher ? ` · ${book.publisher}` : ""}</p>
            </div>
            <button onClick={() => setBook(null)} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--color-ink-muted)] mb-2">책 제목이나 저자로 검색해주세요</p>
            <BookSearchInput onSelect={(b: KakaoBook) => setBook({
              id: b.kakao_id,
              kakao_id: b.kakao_id,
              title: b.title,
              author: b.author,
              publisher: b.publisher,
              cover_url: b.cover_url,
            })} />
          </div>
        )}

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

        <button
          onClick={() => setStep("select")}
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

        <h2 className="font-serif text-xl text-[var(--color-ink)]">밑줄 확인</h2>

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
            선택한 밑줄{validCount > 0 ? ` ${validCount}개` : ""} · 직접 수정 가능해요
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

        {error && <Alert variant="error">{error}</Alert>}

        <button
          onClick={handleSave}
          disabled={validCount === 0 || isSaving}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving
            ? "저장 중..."
            : validCount === 1
            ? "이 문장 저장하기"
            : `${validCount}개 문장 저장하기`}
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
          다른 밑줄 기록하기
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

  function groupConsecutive(set: Set<number>): string[] {
    const sorted = Array.from(set).sort((a, b) => a - b);
    if (sorted.length === 0) return [];
    const groups: number[][] = [];
    let group = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        group.push(sorted[i]);
      } else {
        groups.push(group);
        group = [sorted[i]];
      }
    }
    groups.push(group);
    return groups.map((g) => g.map((i) => clauses[i]).join(" "));
  }

  function toggle(i: number) {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      const texts = groupConsecutive(next);
      onSelect(texts.length > 0 ? texts : [""]);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
      {clauses.map((c, i) => (
        <span
          key={i}
          onClick={() => toggle(i)}
          className={`inline cursor-pointer rounded px-0.5 font-serif text-sm leading-relaxed transition-colors ${
            selectedSet.has(i)
              ? "bg-[var(--color-highlight)]"
              : "hover:bg-[var(--color-cream-dark)]"
          }`}
        >
          {c}{" "}
        </span>
      ))}
    </div>
  );
}
