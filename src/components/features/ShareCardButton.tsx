'use client'

import { useState, useEffect } from 'react'
import type { Underline } from '@/types'

type Props = {
  underline: Underline
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxW: number,
  lineH: number,
): number {
  let line = ''
  let y = startY
  for (const char of text) {
    const test = line + char
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = char
      y += lineH
    } else {
      line = test
    }
  }
  if (line) { ctx.fillText(line, x, y); y += lineH }
  return y
}

async function generateCard(underline: Underline): Promise<Blob> {
  const W = 1080, H = 1350, PAD = 80

  // 한국어 폰트 로드 대기
  try { await document.fonts.ready } catch {}

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 배경
  ctx.fillStyle = '#F7F3EE'
  ctx.fillRect(0, 0, W, H)

  // 책 표지 (프록시로 CORS 우회)
  let cover: HTMLImageElement | null = null
  if (underline.book.cover_url) {
    try {
      cover = await loadImage(`/api/proxy-image?url=${encodeURIComponent(underline.book.cover_url)}`)
    } catch {}
  }

  // 책 정보 영역
  const cvW = 80, cvH = 114
  if (cover) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(PAD, PAD, cvW, cvH)
    ctx.clip()
    ctx.drawImage(cover, PAD, PAD, cvW, cvH)
    ctx.restore()
  }

  const infoX = PAD + (cover ? cvW + 24 : 0)
  const title = underline.book.title.length > 18
    ? underline.book.title.slice(0, 17) + '…'
    : underline.book.title

  ctx.fillStyle = '#1C1917'
  ctx.font = `bold 34px "Noto Serif KR", serif`
  ctx.fillText(title, infoX, PAD + 44)

  ctx.fillStyle = '#6B6560'
  ctx.font = `26px "Noto Serif KR", serif`
  ctx.fillText(underline.book.author, infoX, PAD + 82)

  if (underline.page_number) {
    ctx.fillText(`p.${underline.page_number}`, infoX, PAD + 112)
  }

  // 인용문 영역 (세로 중앙)
  const content = underline.content.length > 180
    ? underline.content.slice(0, 177) + '…'
    : underline.content
  const fontSize = content.length > 120 ? 40 : content.length > 60 ? 46 : 52
  const lineH = Math.round(fontSize * 1.85)
  const quoteX = PAD + 40
  const maxW = W - quoteX - PAD

  ctx.font = `${fontSize}px "Noto Serif KR", serif`

  // 줄 수 미리 계산 (세로 중앙 정렬용)
  let line = '', lineCount = 0
  for (const char of content) {
    const test = line + char
    if (ctx.measureText(test).width > maxW && line) { lineCount++; line = char } else { line = test }
  }
  if (line) lineCount++

  const topBound = PAD + cvH + 80
  const bottomBound = H - PAD - 80
  const textH = lineCount * lineH
  const textStartY = Math.max(topBound, Math.min((topBound + bottomBound) / 2 - textH / 2, bottomBound - textH))

  // 좌측 액센트 바
  ctx.fillStyle = '#1E3A2F'
  ctx.fillRect(PAD, textStartY - 20, 5, textH + 40)

  // 인용문 텍스트
  ctx.fillStyle = '#1C1917'
  ctx.font = `${fontSize}px "Noto Serif KR", serif`
  wrapText(ctx, content, quoteX, textStartY, maxW, lineH)

  // 푸터 구분선
  ctx.strokeStyle = '#E4DDD6'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, H - PAD - 40)
  ctx.lineTo(W - PAD, H - PAD - 40)
  ctx.stroke()

  // 유저명
  ctx.fillStyle = '#6B6560'
  ctx.font = `24px "Noto Serif KR", serif`
  ctx.textAlign = 'left'
  ctx.fillText(`@${underline.user.username}`, PAD, H - PAD)

  // 브랜드
  ctx.fillStyle = '#1E3A2F'
  ctx.font = `bold 28px "Noto Serif KR", serif`
  ctx.textAlign = 'right'
  ctx.fillText('밑줄', W - PAD, H - PAD)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
  })
}

export default function ShareCardButton({ underline }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'ready' | 'error'>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  async function openModal() {
    setOpen(true)
    setPhase('capturing')
    setCapturedBlob(null)
    setCapturedUrl(null)
    setErrorMsg('')
    try {
      const blob = await generateCard(underline)
      setCapturedBlob(blob)
      setCapturedUrl(URL.createObjectURL(blob))
      setPhase('ready')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  function closeModal() {
    setOpen(false)
    setPhase('idle')
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
        onClick={openModal}
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

            {/* 생성 중 */}
            {phase === 'capturing' && (
              <div className="flex flex-col items-center gap-2 py-12 text-[var(--color-ink-faint)] text-xs">
                <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-forest)] rounded-full animate-spin" />
                이미지 생성 중…
              </div>
            )}

            {/* 미리보기 */}
            {phase === 'ready' && capturedUrl && (
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedUrl} alt="카드 미리보기" className="w-full h-auto" />
              </div>
            )}

            {/* 에러 */}
            {phase === 'error' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-[var(--color-ink-muted)]">이미지 생성에 실패했어요</p>
                {errorMsg && <p className="text-xs text-red-500 break-all px-2">{errorMsg}</p>}
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
