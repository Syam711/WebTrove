import { supabase } from './supabase'

/** The words of a query, lower-cased. */
export const termsOf = (q) => [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 6)

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Splits text into plain and highlighted pieces for any of the given terms. */
export function highlight(text, terms) {
  if (!text || !terms.length) return [{ text, hit: false }]
  const parts = text.split(new RegExp(`(${terms.map(esc).join('|')})`, 'i'))
  // With one capture group, the odd pieces are the matches.
  return parts.map((t, i) => ({ text: t, hit: i % 2 === 1 })).filter((p) => p.text)
}

/** A short window of `text` around the first matching term. */
export function excerpt(text, terms, width = 110) {
  if (!text) return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  const lower = flat.toLowerCase()
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0
  const start = Math.max(0, at - Math.floor(width / 3))
  const end = Math.min(flat.length, start + width)
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`
}

/** Ranked search in the database. */
export async function searchRemote(query) {
  const { data, error } = await supabase.rpc('search_links', { query, lim: 30 })
  if (error) throw error
  return data.map((row) => ({ link: row, matched: row.matched_in ?? [] }))
}

/**
 * Same idea as the database function, for preview builds with no database:
 * every word must appear somewhere; title matches rank first.
 */
export function searchLocal(links, query, { tagsOf, collectionsOf }) {
  const terms = termsOf(query)
  if (!terms.length) return []
  const out = []
  for (const link of links) {
    const fields = {
      title: link.title, site: `${link.domain} ${link.url ?? ''}`, note: link.note,
      description: `${link.description ?? ''} ${link.summary ?? ''}`,
      tag: tagsOf(link.id).map((t) => t.name).join(' '),
      collection: collectionsOf(link.id).map((c) => c.name).join(' '),
    }
    const matched = new Set()
    let all = true
    for (const t of terms) {
      const where = Object.entries(fields).filter(([, v]) => v?.toLowerCase().includes(t)).map(([k]) => k)
      if (!where.length) { all = false; break }
      where.forEach((w) => matched.add(w))
    }
    if (!all) continue
    const weight = { title: 0.6, site: 0.3, note: 0.4, description: 0.1, tag: 0.5, collection: 0.3 }
    const rank = [...matched].reduce((s, m) => s + weight[m], 0)
    out.push({ link, matched: [...matched], rank })
  }
  return out.sort((a, b) => b.rank - a.rank || new Date(b.link.created_at) - new Date(a.link.created_at)).slice(0, 30)
}
