'use client'

import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import UnderlineCard from '@/components/features/UnderlineCard'
import type { Underline } from '@/types'

type Props = {
  underline: Underline
}

export default function ShareCardButton({ underline }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'capturing' | 'ready' | 'error'>('capturing')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  useEffect(() => {
    if (!open) return
    setPhase('capturing')
    setCapturedBlob(null)
    setCapturedUrl(null)

    // 이미지 로드 완료 후 캡처
    const timer = setTimeout(async () => {
      const el = cardRef.current
      if (!el) return
      const imgs = Array.from(el.querySelectorAll('img'))
      await Promise.all(imgs.map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r() })
      ))
      try {
        const canvas = await html2canvas(el, {
          useCORS: true,
          scale: 2,
          backgroundColor: null,
          logging: false,
        })
        canvas.toBlob(blob => {
          if (blob) {
            setCapturedBlob(blob)
            setCapturedUrl(URL.createObjectURL(blob))
            setPhase('ready')
          } else {
            setPhase('error')
          }
        }, 'image/png')
      } catch {
        setPhase('error')
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [open])

  function closeModal() {
    setOpen(false)
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
  }

  async function handleDownload() {
    if (!capturedBlob) return
    setDownloading(true)
    const url = URL.createObjectURL(capturedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `underline-${underline.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  async function handleShare() {
    if (!capturedBlob) return
    setSharing(true)
    const file = new File([capturedBlob], `underline-${underline.id}.png`, { type: 'image/png' })
    try {
      await navigator.share({ files: [file], title: '밑줄', text: underline.content.slice(0, 100) })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Share failed:', e)
    }
    setSharing(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-cream-dark)] transition-colors"
        aria-label="카드로 저장"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        카드
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeModal} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-[var(--color-cream)] rounded-t-3xl px-5 pt-4 pb-8 space-y-4">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto" />
            <h3 className="text-base font-semibold text-[var(--color-ink)] text-center pb-1">카드로 저장</h3>

            {/* 캡처 대상 카드 (캡처 중에만 표시) */}
            <div
              ref={cardRef}
              style={{ pointerEvents: 'none' }}
              className={phase === 'capturing' ? 'block' : 'hidden'}
            >
              <UnderlineCard underline={underline} preview />
            </div>

            {/* 생성 중 스피너 */}
            {phase === 'capturing' && (
              <div className="flex items-center justify-center gap-2 text-[var(--color-ink-faint)] text-xs pb-2">
                <div className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-forest)] rounded-full animate-spin" />
                이미지 생성 중…
              </div>
            )}

            {/* 캡처 완료 미리보기 */}
            {phase === 'ready' && capturedUrl && (
              <div className="rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedUrl} alt="카드 미리보기" className="w-full h-auto" />
              </div>
            )}

            {/* 에러 */}
            {phase === 'error' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-[var(--color-ink-muted)]">이미지 생성에 실패했어요</p>
                <button onClick={() => setOpen(false)} className="text-xs text-[var(--color-forest)] underline underline-offset-2">닫기</button>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDownload}
                disabled={phase !== 'ready' || downloading}
                className="flex-1 py-3.5 rounded-2xl bg-[var(--color-forest)] text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                {downloading ? '저장 중…' : '이미지 저장'}
              </button>
              {canShare && (
                <button
                  onClick={handleShare}
                  disabled={phase !== 'ready' || sharing}
                  className="flex-1 py-3.5 rounded-2xl border border-[var(--color-forest)] text-[var(--color-forest)] text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  {sharing ? '공유 중…' : '공유하기'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
