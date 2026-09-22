// Pulls readable metadata out of a page's <head>. No DOM needed.

export type Meta = {
  title?: string
  description?: string
  image?: string
  favicon?: string
  canonical?: string
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      try { return String.fromCodePoint(code) } catch { return m }
    }
    return NAMED[e.toLowerCase()] ?? m
  })
}

const clean = (s: string | undefined, max: number) => {
  if (!s) return undefined
  const t = decodeEntities(s).replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, max) : undefined
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let m: RegExpExecArray | null
  const body = tag.replace(/^<\w+/, '')
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  return out
}

export function resolveUrl(u: string | undefined, base: string): string | undefined {
  if (!u) return undefined
  try {
    const r = new URL(decodeEntities(u).trim(), base)
    return r.protocol === 'http:' || r.protocol === 'https:' ? r.href : undefined
  } catch { return undefined }
}

const TRACKING = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src)$/i

/** Strips tracking parameters and empty fragments so equal pages compare equal. */
export function cleanUrl(input: string): string {
  const u = new URL(input)
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k)
  if (u.hash === '#') u.hash = ''
  return u.href
}

export function parseMetadata(html: string, baseUrl: string): Meta {
  const headEnd = html.search(/<\/head>/i)
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 100_000)

  const meta: Record<string, string> = {}
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag)
    const key = (a.property || a.name || '').toLowerCase()
    if (key && a.content && !(key in meta)) meta[key] = a.content
  }

  let icon: string | undefined, apple: string | undefined, canonical: string | undefined
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const a = attrs(tag)
    const rel = (a.rel || '').toLowerCase().split(/\s+/)
    if (!a.href) continue
    if (rel.includes('canonical')) canonical ??= a.href
    else if (rel.includes('apple-touch-icon')) apple ??= a.href
    else if (rel.includes('icon')) icon ??= a.href
  }

  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return {
    title: clean(meta['og:title'] || meta['twitter:title'] || titleTag, 300),
    description: clean(meta['og:description'] || meta['description'] || meta['twitter:description'], 600),
    image: resolveUrl(meta['og:image'] || meta['twitter:image'], baseUrl),
    favicon: resolveUrl(icon || apple, baseUrl) ?? resolveUrl('/favicon.ico', baseUrl),
    canonical: resolveUrl(canonical || meta['og:url'], baseUrl),
  }
}
