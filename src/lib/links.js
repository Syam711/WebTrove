import { supabase } from './supabase'

const TRACKING = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src)$/i

/** Turns whatever was pasted into a clean http(s) URL, or null. */
export function normalizeUrl(raw) {
  let s = raw.trim()
  if (!s || /\s/.test(s)) return null
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    if (!u.hostname.includes('.')) return null
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k)
    if (u.hash === '#') u.hash = ''
    return u.href
  } catch { return null }
}

export const domainOf = (url) => new URL(url).hostname.replace(/^www\./, '')

// Everything except the (large) search vector.
export const COLUMNS =
  'id,url,canonical_url,domain,title,description,summary,favicon_url,image_url,intent,note,' +
  'enrich_status,enrich_error,health,is_pinned,is_archived,opened_at,open_count,created_at,deleted_at'

export const db = {
  // Everything that isn't in the trash (archived links included); the app sorts them out.
  list: () =>
    supabase.from('links').select(COLUMNS)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(500),
  trashed: () =>
    supabase.from('links').select(COLUMNS)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }).limit(200),
  insert: (row) => supabase.from('links').insert(row).select(COLUMNS).single(),
  insertMany: (rows) => supabase.from('links').insert(rows).select(COLUMNS),
  trash: (id) => supabase.from('links').update({ deleted_at: new Date().toISOString() }).eq('id', id),
  restore: (id) => supabase.from('links').update({ deleted_at: null }).eq('id', id),
  archive: (id, on) => supabase.from('links').update({ is_archived: on }).eq('id', id),
  purge: (id) => supabase.from('links').delete().eq('id', id),
  emptyTrash: () => supabase.from('links').delete().not('deleted_at', 'is', null),
  touch: (id) => supabase.rpc('touch_link', { link_id: id }),
  enrich: (id, force = false) => supabase.functions.invoke('enrich-link', { body: { id, force } }),
}
