'use client'

import { useState, useEffect } from 'react'

type Props = {
  underlineId: string
  content: string
}

export default function ShareCardButton({ underlineId, content }: Props) {
  const [open, setOpen] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [nonce])

  const imageUrl = `/api/og/underline/${underlineId}?style=light&format=portrait&_=${nonce}`

  async function handleDownload() {
    try {
      setDownloading(true)
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error('생성 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `underline-${underlineId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    try {
      setSharing(true)
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error('생성 실패')
      const blob = await res.blob()
      const file = new File([blob], `underline-${underlineId}.png`, { type: 'image/png' })
      await navigator.share({
        files: [file],
        title: '밑줄',
        text: content.slice(0, 100),
      })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Share failed:', e)
      }
    } finally {
      setSharing(false)
    }
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
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />

          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-[var(--color-cream)] rounded-t-3xl px-5 pt-4 pb-8 space-y-4">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto" />
            <h3 className="text-base font-semibold text-[var(--color-ink)] text-center pb-1">카드로 저장</h3>

            {/* Preview */}
            <div className="relative flex items-center justify-center bg-[var(--color-cream-dark)] rounded-2xl overflow-hidden min-h-[200px]">
              {!imgLoaded && !imgError && (
                <div className="flex flex-col items-center gap-2 text-[var(--color-ink-faint)] text-xs">
                  <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-forest)] rounded-full animate-spin" />
                  생성 중…
                </div>
              )}
              {imgError && (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <p className="text-sm text-[var(--color-ink-muted)]">이미지 생성에 실패했어요</p>
                  <button
                    onClick={() => setNonce(n => n + 1)}
                    className="text-xs text-[var(--color-forest)] underline underline-offset-2"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              <img
                key={imageUrl}
                src={imageUrl}
                alt="카드 미리보기"
                onLoad={() => { setImgLoaded(true); setImgError(false); }}
                onError={() => { setImgLoaded(true); setImgError(true); }}
                className={`max-h-64 w-auto object-contain transition-opacity duration-300 ${imgLoaded && !imgError ? 'opacity-100' : 'opacity-0 absolute'}`}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDownload}
                disabled={downloading || imgError || !imgLoaded}
                className="flex-1 py-3.5 rounded-2xl bg-[var(--color-forest)] text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                {downloading ? '저장 중…' : '이미지 저장'}
              </button>
              {canShare && (
                <button
                  onClick={handleShare}
                  disabled={sharing || imgError || !imgLoaded}
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
