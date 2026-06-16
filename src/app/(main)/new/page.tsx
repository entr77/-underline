"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Step = "upload" | "processing" | "book" | "select" | "done";

const STEPS: Step[] = ["upload", "processing", "book", "select"];

const EXTRACTED_TEXT = `새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다. 신의 이름은 아브락사스.

우리가 어떤 인간을 증오한다면, 우리는 그의 모습을 빌어 우리 자신 속에 있는 무언가를 증오하는 것이다.

모든 시작은 그 자체로 하나의 작은 희망이다. 시작하는 것, 그것은 살아있다는 것이다.`;

const SEGMENTS = [
  { text: "새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다. 신의 이름은 아브락사스.", highlighted: true },
  { text: "\n\n우리가 어떤 인간을 증오한다면, 우리는 그의 모습을 빌어 우리 자신 속에 있는 무언가를 증오하는 것이다.", highlighted: false },
  { text: "\n\n모든 시작은 그 자체로 하나의 작은 희망이다. 시작하는 것, 그것은 살아있다는 것이다.", highlighted: false },
];

function StepIndicator({ current }: { current: Step }) {
  const STEP_LABELS = ["사진", "인식", "책", "밑줄"];
  const displaySteps: Step[] = ["upload", "processing", "book", "select"];
  const currentIndex = displaySteps.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {displaySteps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
              i < currentIndex ? "bg-[var(--color-forest)] text-white" :
              i === currentIndex ? "bg-[var(--color-forest)] text-white ring-2 ring-[var(--color-forest)] ring-offset-2" :
              "bg-[var(--color-border)] text-[var(--color-ink-faint)]"
            }`}>
              {i < currentIndex ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              ) : i + 1}
            </div>
            <span className={`text-[9px] mt-0.5 ${i === currentIndex ? "text-[var(--color-forest)] font-medium" : "text-[var(--color-ink-faint)]"}`}>
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < displaySteps.length - 1 && (
            <div className={`w-7 h-px mb-3 mx-1 transition-colors ${i < currentIndex ? "bg-[var(--color-forest)]" : "bg-[var(--color-border)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewUnderlinePage() {
  const [step, setStep] = useState<Step>("upload");
  const [selectedSegments, setSelectedSegments] = useState<boolean[]>([true, false, false]);
  const [pageNumber, setPageNumber] = useState("112");

  useEffect(() => {
    if (step === "processing") {
      const t = setTimeout(() => setStep("book"), 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  const selectedText = SEGMENTS
    .filter((_, i) => selectedSegments[i])
    .map((s) => s.text.trim())
    .join(" ");

  function toggleSegment(i: number) {
    setSelectedSegments((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  if (step === "upload") {
    return (
      <div className="flex flex-col h-full space-y-5">
        <h1 className="font-serif text-xl text-[var(--color-ink)]">밑줄 기록</h1>
        <div
          className="flex-1 min-h-[300px] border-2 border-dashed border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-4 bg-white cursor-pointer hover:border-[var(--color-forest)] transition-colors"
          onClick={() => setStep("processing")}
        >
          <div className="w-14 h-14 rounded-full bg-[var(--color-cream-dark)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-forest)" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div className="text-center">
            <p className="font-medium text-[var(--color-ink)]">책 페이지 사진 찍기</p>
            <p className="text-sm text-[var(--color-ink-faint)] mt-1">또는 갤러리에서 선택</p>
          </div>
        </div>
        <p className="text-xs text-center text-[var(--color-ink-faint)]">
          밑줄 친 부분이 잘 보이도록 평평하게 펴서 찍어주세요
        </p>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="font-serif text-lg text-[var(--color-ink)]">문장을 읽는 중이에요</p>
          <p className="text-sm text-[var(--color-ink-faint)] mt-1">밑줄을 찾고 있어요</p>
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

        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] flex gap-3 items-center">
          <div className="w-12 h-16 bg-[var(--color-forest)] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white/60 text-xs text-center px-1 leading-tight">데미안</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--color-ink)]">데미안</p>
            <p className="text-sm text-[var(--color-ink-faint)]">헤르만 헤세 · 민음사</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-[var(--color-forest)] flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
        </div>

        <button className="w-full py-2 text-sm text-[var(--color-forest)] border border-[var(--color-forest)] rounded-xl hover:bg-[var(--color-forest)] hover:text-white transition-colors">
          다른 책으로 바꾸기
        </button>

        <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)]">
          <label className="text-xs text-[var(--color-ink-faint)] block mb-2">페이지 번호</label>
          <input
            type="number"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            className="w-full text-lg font-medium text-[var(--color-ink)] bg-transparent outline-none"
          />
        </div>

        <button
          onClick={() => setStep("select")}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] transition-colors"
        >
          밑줄 확인하기
        </button>
      </div>
    );
  }

  if (step === "select") {
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
          <p className="text-xs text-[var(--color-ink-faint)]">노란 부분을 눌러 조정할 수 있어요</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
            {SEGMENTS.map((seg, i) => (
              <span
                key={i}
                onClick={() => toggleSegment(i)}
                className={`cursor-pointer rounded px-0.5 transition-colors ${
                  selectedSegments[i]
                    ? "bg-[var(--color-highlight)]"
                    : "hover:bg-[var(--color-cream-dark)]"
                }`}
              >
                {seg.text}
              </span>
            ))}
          </p>
        </div>

        {selectedText && (
          <div className="bg-[var(--color-cream-dark)] rounded-xl p-4">
            <p className="text-xs text-[var(--color-ink-faint)] mb-1">기록할 문장</p>
            <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed">{selectedText}</p>
          </div>
        )}

        <button
          onClick={() => setStep("done")}
          disabled={!selectedText}
          className="w-full py-4 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          이 문장으로 기록
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--color-forest)] flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div>
        <p className="font-serif text-xl text-[var(--color-ink)]">문장이 남았어요</p>
        <p className="text-sm text-[var(--color-ink-faint)] mt-1">데미안 · p.{pageNumber}</p>
      </div>
      <div className="flex flex-col gap-3 w-full mt-2">
        <Link
          href="/new"
          onClick={() => setStep("upload")}
          className="block w-full py-3.5 rounded-2xl border border-[var(--color-forest)] text-[var(--color-forest)] font-medium hover:bg-[var(--color-forest)] hover:text-white transition-colors"
        >
          다른 밑줄 기록하기
        </Link>
        <Link
          href="/"
          className="block w-full py-3.5 rounded-2xl bg-[var(--color-forest)] text-white font-medium hover:bg-[var(--color-forest-light)] transition-colors"
        >
          다른 밑줄 읽어보기
        </Link>
      </div>
    </div>
  );
}
