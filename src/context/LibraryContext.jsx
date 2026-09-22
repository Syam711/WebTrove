import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { db, domainOf, normalizeUrl } from '../lib/links'
import { org } from '../lib/organize'
import { normalizeTag } from '../lib/tags'
import { COLORS } from '../lib/colors'
import Toast from '../components/Toast'

const Ctx = createContext(null)
export const useLibrary = () => useContext(Ctx)

const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at)
const byName = (a, b) => a.name.localeCompare(b.name)
const groupBy = (rows, key, val) => rows.reduce((m, r) => { (m[r[key]] ||= []).push(r[val]); return m }, {})
const setMember = (map, id, member, on) => {
  const cur = map[id] || []
  const next = on ? (cur.includes(member) ? cur : [...cur, member]) : cur.filter((x) => x !== member)
  return { ...map, [id]: next }
}

/**
 * The user's whole library: links, collections, tags and how they connect.
 * With Supabase keys it reads and writes the database; without them (preview builds)
 * everything lives in memory for the length of the tab.
 */
export function LibraryProvider({ children }) {
  const [all, setAll] = useState([])
  const inflight = useRef(new Set())
  const [collections, setCollections] = useState([])
  const [tags, setTags] = useState([])
  const [linkCollections, setLC] = useState({})
  const [linkTags, setLT] = useState({})
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  // Newest first, by the date each link was saved (imports keep their original dates).
  const sorted = useMemo(() => [...all].sort(byNewest), [all])
  const links = useMemo(() => sorted.filter((l) => !l.deleted_at && !l.is_archived), [sorted])
  const archived = useMemo(() => sorted.filter((l) => !l.deleted_at && l.is_archived), [sorted])
  const trashed = useMemo(
    () => all.filter((l) => l.deleted_at).sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at)), [all])
  const searchable = useMemo(() => sorted.filter((l) => !l.deleted_at), [sorted])

  const flash = useCallback((t) => {
    clearTimeout(timer.current)
    setToast(t)
    timer.current = setTimeout(() => setToast(null), 6000)
  }, [])
  const problem = useCallback((text = 'That didn’t go through. Try again.') => flash({ text }), [flash])

  const patchLink = useCallback((id, next) =>
    setAll((prev) => prev.map((l) => (l.id === id ? { ...l, ...next } : l))), [])

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [l, tr, c, lc, t, lt] = await Promise.all([
      db.list(), db.trashed(), org.collections(), org.linkCollections(), org.tags(), org.linkTags(),
    ])
    if ([l, tr, c, lc, t, lt].some((r) => r.error)) {
      setError('Could not load your library. Check your connection and try again.')
    } else {
      setAll([...l.data, ...tr.data]); setCollections(c.data); setTags(t.data)
      setLC(groupBy(lc.data, 'link_id', 'collection_id'))
      setLT(groupBy(lt.data, 'link_id', 'tag_id'))
      setError('')
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  /* ───────── links ───────── */

  const similarRef = useRef(null)
  similarRef.current = (s) => flash({ text: `This looks a lot like “${s.title || s.url}”, which you already have.` })

  const enrich = useCallback(async (id, force = false) => {
    if (!supabase || inflight.current.has(id)) return
    inflight.current.add(id)
    patchLink(id, { enrich_status: 'processing', enrich_error: null })
    try {
      const { data, error: err } = await db.enrich(id, force)
      if (err || !data?.link) {
        patchLink(id, { enrich_status: 'failed', enrich_error: 'Could not reach the page reader.' })
        return
      }
      patchLink(id, data.link)
      if (data.similar) similarRef.current(data.similar)
    } finally {
      inflight.current.delete(id)
    }
  }, [patchLink])

  // Links that still need their page read (imports, or a closed tab) are worked through two at a time.
  useEffect(() => {
    if (!supabase) return
    let slots = 2 - inflight.current.size
    for (const l of all) {
      if (slots <= 0) break
      if (l.enrich_status === 'pending' && !l.deleted_at && !String(l.id).startsWith('tmp-') && !inflight.current.has(l.id)) {
        enrich(l.id); slots--
      }
    }
  }, [all, enrich])

  const toggleCollection = useCallback(async (linkId, collectionId, force) => {
    const has = (linkCollections[linkId] || []).includes(collectionId)
    const on = force ?? !has
    if (on === has) return
    setLC((prev) => setMember(prev, linkId, collectionId, on))
    if (!supabase) return
    const { error: err } = on ? await org.addToCollection(linkId, collectionId) : await org.removeFromCollection(linkId, collectionId)
    if (err) { setLC((prev) => setMember(prev, linkId, collectionId, !on)); problem() }
  }, [linkCollections, problem])

  const add = useCallback(async ({ url, intent, note, collectionId }) => {
    const clean = normalizeUrl(url)
    if (!clean) return { error: 'That doesn’t look like a link.' }
    const domain = domainOf(clean)
    const row = { url: clean, domain, intent, note: note?.trim() || null }

    if (!supabase) {
      if (all.some((l) => l.url === clean && !l.deleted_at)) return { duplicate: true }
      const id = crypto.randomUUID()
      setAll((prev) => [{ id, ...row, title: domain, enrich_status: 'done', created_at: new Date().toISOString() }, ...prev])
      if (collectionId) setLC((prev) => setMember(prev, id, collectionId, true))
      return { ok: true }
    }

    const tempId = `tmp-${crypto.randomUUID()}`
    setAll((prev) => [{ id: tempId, ...row, title: null, enrich_status: 'pending', created_at: new Date().toISOString() }, ...prev])
    const { data, error: err } = await db.insert(row)
    if (err) {
      setAll((prev) => prev.filter((l) => l.id !== tempId))
      return err.code === '23505' ? { duplicate: true } : { error: 'Could not save that link. Try again.' }
    }
    setAll((prev) => prev.map((l) => (l.id === tempId ? data : l)))
    if (collectionId) toggleCollection(data.id, collectionId, true)
    enrich(data.id)
    return { ok: true }
  }, [all, enrich, toggleCollection])

  const trash = useCallback(async (link) => {
    patchLink(link.id, { deleted_at: new Date().toISOString() })
    if (supabase) await db.trash(link.id)
  }, [patchLink])
  const restore = useCallback(async (link) => {
    patchLink(link.id, { deleted_at: null })
    if (supabase) await db.restore(link.id)
  }, [patchLink])
  const archive = useCallback(async (link, on = true) => {
    patchLink(link.id, { is_archived: on })
    if (!supabase) return
    const { error: err } = await db.archive(link.id, on)
    if (err) { patchLink(link.id, { is_archived: !on }); problem() }
  }, [patchLink, problem])
  const purge = useCallback(async (link) => {
    if (supabase) {
      const { error: err } = await db.purge(link.id)
      if (err) return problem('Could not delete that link.')
    }
    setAll((prev) => prev.filter((l) => l.id !== link.id))
  }, [problem])
  const emptyTrash = useCallback(async () => {
    if (supabase) {
      const { error: err } = await db.emptyTrash()
      if (err) return problem('Could not empty the trash.')
    }
    setAll((prev) => prev.filter((l) => !l.deleted_at))
  }, [problem])
  const opened = useCallback((link) => { if (supabase) db.touch(link.id) }, [])

  const updateLink = useCallback(async (id, patch) => {
    const before = all.find((l) => l.id === id)
    patchLink(id, patch)
    if (!supabase) return
    const { error: err } = await org.updateLink(id, patch)
    if (err) {
      patchLink(id, Object.fromEntries(Object.keys(patch).map((k) => [k, before?.[k]])))
      problem()
    }
  }, [all, patchLink, problem])

  /* ───────── collections ───────── */

  const createCollection = useCallback(async (name, color) => {
    const clean = name.trim()
    if (!clean) return { error: 'Give it a name.' }
    const position = collections.reduce((m, c) => Math.max(m, c.position ?? 0), 0) + 1
    if (!supabase) {
      if (collections.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return { error: 'You already have a collection with that name.' }
      const c = { id: crypto.randomUUID(), name: clean, color, position, created_at: new Date().toISOString() }
      setCollections((prev) => [...prev, c])
      return { collection: c }
    }
    const { data, error: err } = await org.createCollection({ name: clean, color, position })
    if (err) return { error: err.code === '23505' ? 'You already have a collection with that name.' : 'Could not create it. Try again.' }
    setCollections((prev) => [...prev, data])
    return { collection: data }
  }, [collections])

  const updateCollection = useCallback(async (id, patch) => {
    const name = patch.name?.trim()
    if (patch.name !== undefined && !name) return { error: 'Give it a name.' }
    const next = { ...patch, ...(name ? { name } : {}) }
    if (!supabase) {
      if (name && collections.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return { error: 'You already have a collection with that name.' }
      setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)))
      return {}
    }
    const { error: err } = await org.updateCollection(id, next)
    if (err) return { error: err.code === '23505' ? 'You already have a collection with that name.' : 'Could not save that. Try again.' }
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)))
    return {}
  }, [collections])

  const deleteCollection = useCallback(async (id) => {
    if (supabase) {
      const { error: err } = await org.deleteCollection(id)
      if (err) return problem('Could not delete that collection.')
    }
    setCollections((prev) => prev.filter((c) => c.id !== id))
    setLC((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((x) => x !== id)])))
  }, [problem])

  /* ───────── tags ───────── */

  const addTag = useCallback(async (linkId, raw) => {
    const name = normalizeTag(raw)
    if (!name) return
    let tag = tags.find((t) => t.name === name)
    if (!tag) {
      if (!supabase) tag = { id: crypto.randomUUID(), name }
      else {
        const { data, error: err } = await org.createTag(name)
        if (err && err.code === '23505') {          // created elsewhere; pick it up
          const r = await org.tags()
          if (!r.error) { setTags(r.data); tag = r.data.find((t) => t.name === name) }
        } else if (!err) tag = data
        if (!tag) return problem()
      }
      setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag].sort(byName)))
    }
    if ((linkTags[linkId] || []).includes(tag.id)) return
    setLT((prev) => setMember(prev, linkId, tag.id, true))
    if (!supabase) return
    const { error: err } = await org.addTag(linkId, tag.id)
    if (err) { setLT((prev) => setMember(prev, linkId, tag.id, false)); problem() }
  }, [tags, linkTags, problem])

  const removeTag = useCallback(async (linkId, tagId) => {
    setLT((prev) => setMember(prev, linkId, tagId, false))
    if (!supabase) return
    const { error: err } = await org.removeTag(linkId, tagId)
    if (err) { setLT((prev) => setMember(prev, linkId, tagId, true)); problem() }
  }, [problem])

  /* ───────── import ───────── */

  // Adds many links at once (a bookmarks file, or a pasted list). Folders can become collections.
  const importLinks = useCallback(async (entries, { intent = 'other', useFolders = true, onProgress } = {}) => {
    const result = { added: 0, failed: 0, collectionsMade: 0 }
    const folderId = {}
    if (useFolders) {
      const names = [...new Set(entries.map((e) => e.folder).filter(Boolean))]
      let made = 0
      for (const name of names) {
        const existing = collections.find((c) => c.name.toLowerCase() === name.toLowerCase())
        if (existing) { folderId[name] = existing.id; continue }
        const res = await createCollection(name, COLORS[(collections.length + made) % COLORS.length])
        if (res.collection) { folderId[name] = res.collection.id; made++ }
      }
      result.collectionsMade = made
    }

    const toRow = (e) => ({
      url: e.url, domain: domainOf(e.url), title: e.title, intent,
      ...(e.added ? { created_at: e.added } : {}),
    })
    const folderOf = Object.fromEntries(entries.map((e) => [e.url, e.folder && folderId[e.folder]]))
    const pairs = []

    if (!supabase) {
      const made = entries.map((e) => ({
        id: crypto.randomUUID(), ...toRow(e), title: e.title || domainOf(e.url), enrich_status: 'done',
        created_at: e.added ?? new Date().toISOString(),
      }))
      setAll((prev) => [...made, ...prev])
      for (const l of made) if (folderOf[l.url]) pairs.push([l.id, folderOf[l.url]])
      setLC((prev) => pairs.reduce((m, [lid, cid]) => setMember(m, lid, cid, true), prev))
      result.added = made.length
      onProgress?.(entries.length, entries.length)
      return result
    }

    const CHUNK = 100
    for (let i = 0; i < entries.length; i += CHUNK) {
      const slice = entries.slice(i, i + CHUNK)
      let saved = []
      const { data, error: err } = await db.insertMany(slice.map(toRow))
      if (!err) saved = data
      else {                       // one bad row shouldn't sink the batch: retry one by one
        for (const e of slice) {
          const one = await db.insert(toRow(e))
          if (one.data) saved.push(one.data)
          else if (one.error?.code !== '23505') result.failed++
        }
      }
      setAll((prev) => [...saved, ...prev])
      for (const l of saved) if (folderOf[l.url]) pairs.push({ link_id: l.id, collection_id: folderOf[l.url] })
      result.added += saved.length
      onProgress?.(Math.min(i + CHUNK, entries.length), entries.length)
    }

    for (let i = 0; i < pairs.length; i += 500) {
      const chunk = pairs.slice(i, i + 500)
      const { error: err } = await supabase.from('link_collections').insert(chunk)
      if (!err) setLC((prev) => chunk.reduce((m, p) => setMember(m, p.link_id, p.collection_id, true), prev))
    }
    return result
  }, [collections, createCollection])

  /* ───────── derived ───────── */

  const derived = useMemo(() => {
    const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))
    const collectionById = Object.fromEntries(collections.map((c) => [c.id, c]))
    const live = new Set(links.map((l) => l.id))
    const collectionCount = {}
    for (const [lid, ids] of Object.entries(linkCollections)) if (live.has(lid)) for (const c of ids) collectionCount[c] = (collectionCount[c] || 0) + 1
    const tagCount = {}
    for (const [lid, ids] of Object.entries(linkTags)) if (live.has(lid)) for (const t of ids) tagCount[t] = (tagCount[t] || 0) + 1
    return {
      tagById, collectionById, collectionCount, tagCount,
      tagsOf: (id) => (linkTags[id] || []).map((t) => tagById[t]).filter(Boolean),
      collectionsOf: (id) => (linkCollections[id] || []).map((c) => collectionById[c]).filter(Boolean),
      popularTags: tags.filter((t) => tagCount[t.id]).sort((a, b) => tagCount[b.id] - tagCount[a.id]).slice(0, 10),
    }
  }, [tags, collections, links, linkTags, linkCollections])

  const value = {
    links, archived, trashed, searchable, allLinks: all,
    collections, tags, linkCollections, linkTags, loading, error, flash,
    add, trash, restore, archive, purge, emptyTrash, importLinks, opened, updateLink, retry: (id) => enrich(id, true), reload: load,
    toggleCollection, createCollection, updateCollection, deleteCollection, addTag, removeTag,
    ...derived,
  }
  return (
    <Ctx.Provider value={value}>
      {children}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Ctx.Provider>
  )
}
