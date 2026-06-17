"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import BookSearchInput, { type KakaoBook } from "@/components/features/BookSearchInput";
import { imageFileToBase64, uploadImage } from "@/lib/storage";
import { createUnderline } from "@/app/actions/underline";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/types";

type Step = "upload" | "processing" | "book" | "select" | "done";

type AnalyzeResult = {
  fullText: string;
  detectedUnderlineRanges: { start: number; end: number }[];
  pageNumber: string | null;
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
  const [processingMsg, setProcessingMsg] = useState("문장을 읽는 중이에요");
  const [book, setBook] = useState<Book | null>(null);
  const [pageNumber, setPageNumber] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setStep("processing");
    setError(null);

    try {
      setProcessingMsg("문장을 읽는 중이에요");
      const base64 = await imageFileToBase64(file);

      const msgs = ["밑줄을 찾고 있어요", "책 정보를 확인하는 중이에요"];
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
        const hasVisionKey = true; // key 미설정 시 fallback
        if (!hasVisionKey) throw new Error("Vision API 키가 없어요");
        // API 키 없어도 수동 입력으로 진행
        setAnalyzeResult({ fullText: "", detectedUnderlineRanges: [], pageNumber: null });
      } else {
        const data: AnalyzeResult = await res.json();
        setAnalyzeResult(data);
        if (data.pageNumber) setPageNumber(data.pageNumber);
        if (data.fullText && data.detectedUnderlineRanges.length > 0) {
          const { start, end } = data.detectedUnderlineRanges[0];
          setSelectedText(data.fullText.slice(start, end).trim());
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
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    processImage(file);
  };

  const handleSave = async () => {
    if (!book || !selectedText) return;
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
          // 스토리지 업로드 실패해도 텍스트만으로 저장
        }
      }

      const result = await createUnderline({
        bookKakaoId: book.kakao_id,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookPublisher: book.publisher,
        bookCoverUrl: book.cover_url,
        content: selectedText,
        pageNumber: pageNumber ? parseInt(pageNumber) : undefined,
        imageUrl,
      });

      if (result && "error" in result) {
        setError(result.error as string);
      } else if (result && "id" in result) {
        router.push(`/underline/${result.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
    } finally {
      setIsSaving(false);
    }
  };

  // Processing step: rotating messages
  useEffect(() => {
    if (step !== "processing") return;
    const t = setInterval(() => {
      setProcessingMsg((m) => m === "문장을 읽는 중이에요" ? "밑줄을 찾고 있어요" : "문장을 읽는 중이에요");
    }, 1200);
    return () => clearInterval(t);
  }, [step]);

  if (step === "upload") {
    return (
      <div className="flex flex-col h-full space-y-5">
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 기록</h1>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="flex-1 min-h-[300px] border-2 border-dashed border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-4 bg-white cursor-pointer hover:border-[var(--color-forest)] transition-colors">
          <input
            ref={fileInputRef}
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

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        {imagePreview && (
          <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-[var(--color-border)] opacity-60">
            <Image src={imagePreview} alt="업로드 이미지" fill className="object-cover" />
          </div>
        )}
        <div className="w-10 h-10 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="font-serif text-lg text-[var(--color-ink)]">{processingMsg}</p>
        </div>
      </div>
    );
  }

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
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[var(--color-border)]">
            <Image src={imagePreview} alt="촬영 이미지" fill className="object-cover" />
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
      </div>
    );
  }

  if (step === "select") {
    const fullText = analyzeResult?.fullText ?? "";
    const hasOcr = fullText.length > 0;

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("book")} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <StepIndicator current="select" />
        </div>

        <div>
          <h2 className="font-serif text-xl text-[var(--color-ink)] mb-1">밑줄이 맞게 잡혔나요?</h2>
          <p className="text-xs text-[var(--color-ink-faint)]">
            {hasOcr ? "노란 부분을 눌러 조정할 수 있어요" : "직접 밑줄 친 문장을 입력해주세요"}
          </p>
        </div>

        {hasOcr ? (
          <OcrTextSelector
            fullText={fullText}
            initialSelected={selectedText}
            onSelect={setSelectedText}
          />
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <textarea
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="밑줄 친 문장을 직접 입력해주세요"
              rows={5}
              className="w-full font-serif text-sm text-[var(--color-ink)] bg-transparent outline-none resize-none placeholder:text-[var(--color-ink-faint)] leading-relaxed"
            />
          </div>
        )}

        {selectedText.trim() && (
          <div className="bg-[var(--color-cream-dark)] rounded-xl p-4">
            <p className="text-xs text-[var(--color-ink-faint)] mb-1">기록할 문장</p>
            <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed">{selectedText.trim()}</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={!selectedText.trim() || isSaving}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "저장 중..." : "이 문장으로 기록"}
        </button>
      </div>
    );
  }

  // done
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
          onClick={() => {
            setStep("upload");
            setImageFile(null);
            setImagePreview(null);
            setAnalyzeResult(null);
            setBook(null);
            setPageNumber("");
            setSelectedText("");
            setSavedId(null);
            setError(null);
          }}
          className="block w-full py-3.5 rounded-2xl border border-[var(--color-forest)] text-[var(--color-forest)] font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors"
        >
          다른 밑줄 기록하기
        </button>
        <Link
          href={savedId ? `/underline/${savedId}` : "/"}
          className="block w-full py-3.5 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] transition-colors"
        >
          {savedId ? "내 밑줄 보기" : "다른 밑줄 읽어보기"}
        </Link>
      </div>
    </div>
  );
}

// OCR 텍스트 문단 단위 선택 컴포넌트
function OcrTextSelector({
  fullText,
  initialSelected,
  onSelect,
}: {
  fullText: string;
  initialSelected: string;
  onSelect: (text: string) => void;
}) {
  const paragraphs = fullText.split(/\n+/).filter((p) => p.trim().length > 0);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(() => {
    const init = new Set<number>();
    if (initialSelected) {
      paragraphs.forEach((p, i) => {
        if (initialSelected.includes(p.trim())) init.add(i);
      });
      if (init.size === 0 && paragraphs.length > 0) init.add(0);
    }
    return init;
  });

  function toggle(i: number) {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      const text = paragraphs
        .filter((_, idx) => next.has(idx))
        .join(" ");
      onSelect(text);
      return next;
    });
  }

  useEffect(() => {
    const text = paragraphs
      .filter((_, i) => selectedSet.has(i))
      .join(" ");
    onSelect(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] space-y-1">
      {paragraphs.map((p, i) => (
        <span
          key={i}
          onClick={() => toggle(i)}
          className={`inline cursor-pointer rounded px-0.5 font-serif text-sm leading-relaxed transition-colors ${
            selectedSet.has(i)
              ? "bg-[var(--color-highlight)]"
              : "hover:bg-[var(--color-cream-dark)]"
          }`}
        >
          {p}{" "}
        </span>
      ))}
    </div>
  );
}
