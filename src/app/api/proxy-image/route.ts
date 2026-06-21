export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return new Response('No URL', { status: 400 })
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return new Response('Fetch failed', { status: 502 })
    const ct = res.headers.get('content-type') || 'image/jpeg'
    if (!ct.startsWith('image/')) return new Response('Not an image', { status: 400 })
    const buf = await res.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response('Proxy failed', { status: 500 })
  }
}
