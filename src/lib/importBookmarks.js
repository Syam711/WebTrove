import { normalizeUrl } from './links'

// Folders every browser adds at the top; they say nothing about what a link is for.
const ROOTS = new Set([
  'bookmarks bar', 'bookmarks', 'other bookmarks', 'other favorites', 'favorites', 'favorites bar',
  'bookmarks menu', 'bookmarks toolbar', 'mobile bookmarks', 'reading list', 'menu', 'toolbar',
])

const MAX_LINKS = 5000

function finish(raw) {
  const seen = new Set()
  const entries = []
  let skipped = 0, duplicates = 0
  for (const r of raw) {
    const url = /^https?:/i.test(r.href ?? '') || !/^[a-z][a-z0-9+.-]*:/i.test(r.href ?? '') ? normalizeUrl(r.href ?? '') : null
    if (!url) { skipped++; continue }
    if (seen.has(url)) { duplicates++; continue }
    seen.add(url)
    if (entries.length >= MAX_LINKS) { skipped++; continue }
    const title = (r.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)
    const secs = Number(r.addDate)
    const added = secs > 631152000 && secs * 1000 <= Date.now() ? new Date(secs * 1000).toISOString() : null
    entries.push({ url, title: title && title !== r.href ? title : null, added, folder: r.folder || null })
  }
  return { entries, skipped, duplicates }
}

/** Reads the standard bookmarks export that Chrome, Edge, Firefox and Safari all produce. */
export function parseBookmarksHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const raw = []
  for (const a of doc.querySelectorAll('a[href]')) {
    // The folder of a link is named by the heading that sits just before each <dl> around it.
    const path = []
    for (let el = a.parentElement; el; el = el.parentElement) {
      if (el.tagName === 'DL') {
        const h = el.previousElementSibling
        if (h?.tagName === 'H3') path.unshift(h.textContent.trim())
      }
    }
    while (path.length && ROOTS.has(path[0].toLowerCase())) path.shift()
    raw.push({
      href: a.getAttribute('href'), title: a.textContent, addDate: a.getAttribute('add_date'),
      folder: path.filter(Boolean).join(' / ').slice(0, 60),
    })
  }
  return finish(raw)
}

/** One link per line (anything else on the line is ignored). */
export function parseLinkList(text) {
  const raw = text.split(/\r?\n/).map((line) => {
    const m = line.match(/https?:\/\/\S+/i) || line.trim().match(/^(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i)
    return m ? { href: m[0] } : null
  }).filter(Boolean)
  return finish(raw)
}
