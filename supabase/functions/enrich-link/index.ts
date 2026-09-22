// enrich-link — reads a saved page and fills in title, description, image, favicon, canonical URL.
// Runs as the signed-in user (their JWT), so row level security applies to every query.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { cleanUrl, parseMetadata } from './parse.ts'
import { isPrivateIp, urlProblem } from './net.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const MAX_BYTES = 512 * 1024
const MAX_HOPS = 5
const TIMEOUT_MS = 6000
const UA = 'Mozilla/5.0 (compatible; RecallBot/0.1; link preview)'

class Unreadable extends Error {
  constructor(message: string, public health: 'not_found' | 'unavailable' = 'unavailable') { super(message) }
}

async function assertPublicHost(u: URL) {
  const problem = urlProblem(u)
  if (problem) throw new Unreadable(problem)
  const host = u.hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) return // literal IP already checked
  const ips: string[] = []
  for (const type of ['A', 'AAAA'] as const) {
    try { ips.push(...(await Deno.resolveDns(host, type))) } catch { /* no records of this type */ }
  }
  if (!ips.length) throw new Unreadable('That address could not be found.')
  if (ips.some(isPrivateIp)) throw new Unreadable('Private addresses are not allowed.')
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value); total += value.length
  }
  await reader.cancel().catch(() => {})
  const all = new Uint8Array(total)
  let o = 0
  for (const c of chunks) { all.set(c, o); o += c.length }
  return new TextDecoder('utf-8', { fatal: false }).decode(all)
}

async function fetchPage(start: string): Promise<{ finalUrl: string; html: string; redirected: boolean }> {
  let url = new URL(start)
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await assertPublicHost(url)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url, {
        redirect: 'manual', signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
      })
    } catch { throw new Unreadable('The site did not respond in time.') }
    finally { clearTimeout(timer) }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => {})
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    if (res.status === 404 || res.status === 410) throw new Unreadable('This page no longer exists.', 'not_found')
    if (!res.ok) throw new Unreadable(`The site answered with an error (${res.status}).`)
    const type = res.headers.get('content-type') ?? ''
    if (!/html|xml/i.test(type)) { await res.body?.cancel().catch(() => {}); return { finalUrl: url.href, html: '', redirected: url.href !== start } }
    return { finalUrl: url.href, html: await readCapped(res), redirected: url.href !== start }
  }
  throw new Unreadable('Too many redirects.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Not signed in.' }, 401)

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })

  let body: { id?: string; force?: boolean }
  try { body = await req.json() } catch { return json({ error: 'Bad request.' }, 400) }
  if (!body.id) return json({ error: 'Missing link id.' }, 400)

  const { data: link } = await supa.from('links').select('*').eq('id', body.id).maybeSingle()
  if (!link) return json({ error: 'Link not found.' }, 404)
  if (link.enrich_status === 'done' && !body.force) return json({ link })

  await supa.from('links').update({ enrich_status: 'processing', enrich_error: null }).eq('id', link.id)

  let patch: Record<string, unknown>
  let canonical: string | null = null
  try {
    const page = await fetchPage(link.url)
    const meta = parseMetadata(page.html, page.finalUrl)
    canonical = cleanUrl(meta.canonical ?? page.finalUrl)
    patch = {
      title: meta.title ?? link.title,
      description: meta.description ?? null,
      image_url: meta.image ?? null,
      favicon_url: meta.favicon ?? null,
      canonical_url: canonical,
      enrich_status: 'done',
      enrich_error: null,
      health: page.redirected ? 'redirected' : 'ok',
      checked_at: new Date().toISOString(),
    }
  } catch (e) {
    const err = e instanceof Unreadable ? e : new Unreadable('Something went wrong reading this page.')
    patch = {
      enrich_status: 'failed', enrich_error: err.message,
      health: err.health, checked_at: new Date().toISOString(),
    }
  }

  const { data: updated, error } = await supa.from('links').update(patch).eq('id', link.id).select().single()
  if (error) return json({ error: 'Could not update the link.' }, 500)

  let similar = null
  if (canonical) {
    const { data } = await supa.from('links').select('id,title,url')
      .eq('canonical_url', canonical).neq('id', link.id).is('deleted_at', null).limit(1)
    similar = data?.[0] ?? null
  }
  return json({ link: updated, similar })
})
