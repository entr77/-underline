import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'

type Format = 'square' | 'portrait' | 'story'
type Style = 'light' | 'dark'

const SIZES: Record<Format, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
}

const THEMES: Record<Style, {
  bg: string; text: string; muted: string;
  accentBar: string; border: string; brand: string;
}> = {
  light: {
    bg: '#F7F3EE',
    text: '#1C1917',
    muted: '#6B6560',
    accentBar: '#1E3A2F',
    border: '#E4DDD6',
    brand: '#1E3A2F',
  },
  dark: {
    bg: '#1C2E24',
    text: '#F7F3EE',
    muted: '#9AB5A5',
    accentBar: '#FFF3B0',
    border: '#2D4A3A',
    brand: '#FFF3B0',
  },
}

async function fetchWithTimeout(url: string, options: RequestInit, ms = 5000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const shortText = text.slice(0, 120)
    const css = await fetchWithTimeout(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400&text=${encodeURIComponent(shortText)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } },
      5000
    ).then(r => r.text())

    const fontUrl = css.match(/src: url\(([^)]+\.woff2[^)]*)\)/)?.[1]
    if (!fontUrl) return null

    return fetchWithTimeout(fontUrl, {}, 6000).then(r => r.arrayBuffer())
  } catch {
    return null
  }
}

type UnderlineRow = {
  content: string
  page_number: number | null
  user: { username: string } | null
  book: { title: string; author: string; cover_url: string | null } | null
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)

    const style: Style = searchParams.get('style') === 'dark' ? 'dark' : 'light'
    const rawFormat = searchParams.get('format')
    const format: Format = rawFormat === 'square' || rawFormat === 'story' ? rawFormat : 'portrait'

    const size = SIZES[format]
    const theme = THEMES[style]

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('underlines')
      .select('content, page_number, user:users!underlines_user_id_fkey(username), book:books(title, author, cover_url)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return new Response('Not found', { status: 404 })
    }

    const row = data as unknown as UnderlineRow
    const content = row.content
    const bookTitle = row.book?.title ?? '알 수 없는 책'
    const author = row.book?.author ?? ''
    const coverUrl = row.book?.cover_url ?? null
    const username = row.user?.username ?? ''
    const pageNumber = row.page_number

    const displayContent = content.length > 180 ? content.slice(0, 177) + '…' : content
    const fontSize = displayContent.length > 120
      ? (format === 'square' ? 38 : 42)
      : (format === 'square' ? 44 : 48)

    const padding = format === 'story' ? 100 : 80

    // 커버 이미지를 서버에서 data URL로 변환 (Satori가 직접 fetch하면 Kakao CDN에서 실패함)
    let coverDataUrl: string | null = null
    if (coverUrl) {
      try {
        const res = await fetchWithTimeout(coverUrl, {}, 4000)
        if (res.ok) {
          const buf = await res.arrayBuffer()
          const mime = res.headers.get('content-type') || 'image/jpeg'
          coverDataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
        }
      } catch { /* 실패 시 fallback placeholder 사용 */ }
    }

    const fontText = `${displayContent}${bookTitle}${author}${username}밑줄`
    const fontData = await loadKoreanFont(fontText)

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.bg,
            padding: `${padding}px`,
            fontFamily: 'NotoSerifKR, serif',
          }}
        >
          {/* Book info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '28px', marginBottom: '60px' }}>
            {coverDataUrl ? (
              <img
                src={coverDataUrl}
                width={80}
                height={110}
                style={{ borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '110px',
                flexShrink: 0,
                borderRadius: '4px',
                backgroundColor: theme.accentBar,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: theme.bg, fontSize: '32px' }}>B</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: theme.text, lineHeight: 1.3 }}>
                {bookTitle}
              </span>
              <span style={{ fontSize: 26, color: theme.muted }}>{author}</span>
              {pageNumber && (
                <span style={{ fontSize: 22, color: theme.muted }}>p.{pageNumber}</span>
              )}
            </div>
          </div>

          {/* Quote */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '40px',
            borderLeft: `5px solid ${theme.accentBar}`,
          }}>
            <span style={{
              fontSize,
              color: theme.text,
              lineHeight: 1.85,
              letterSpacing: '0.01em',
            }}>
              &ldquo;{displayContent}&rdquo;
            </span>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '60px',
            paddingTop: '36px',
            borderTop: `1px solid ${theme.border}`,
          }}>
            <span style={{ fontSize: 24, color: theme.muted }}>@{username}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: theme.brand,
              }} />
              <span style={{ fontSize: 28, fontWeight: 700, color: theme.brand }}>밑줄</span>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: fontData
          ? [{ name: 'NotoSerifKR', data: fontData, weight: 400, style: 'normal' }]
          : [],
      }
    )
  } catch (e) {
    console.error('[OG] image generation failed:', e)
    return new Response('Image generation failed', { status: 500 })
  }
}
