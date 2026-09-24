import { supabase } from './supabase'

const MIN_AGE_DAYS = 4
const dayMs = 86400000

/** Same rule as the database function, for preview builds with no database. */
export function rediscoverLocal(links, lim = 3) {
  const now = Date.now()
  const tier = { learn: 0, read: 0, reference: 1, project: 1 }
  return links
    .filter((l) => !l.deleted_at && !l.is_archived && l.enrich_status === 'done'
      && now - new Date(l.created_at).getTime() > MIN_AGE_DAYS * dayMs
      && (!l.opened_at || now - new Date(l.opened_at).getTime() > 3 * dayMs))
    .sort((a, b) => {
      const t = (tier[a.intent] ?? 2) - (tier[b.intent] ?? 2)
      if (t) return t
      return new Date(a.opened_at ?? a.created_at) - new Date(b.opened_at ?? b.created_at)
    })
    .slice(0, lim)
}

export async function rediscoverRemote(lim = 3) {
  const { data, error } = await supabase.rpc('rediscover_links', { lim })
  if (error) throw error
  return data
}
