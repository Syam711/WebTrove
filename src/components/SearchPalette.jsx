import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, FolderClosed, Hash, Search } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { supabase } from '../lib/supabase'
import { normalizeUrl } from '../lib/links'
import { colorVar } from '../lib/colors'
import { intentLabel } from '../lib/intents'
import { timeAgo } from '../lib/time'
import { excerpt, highlight, searchLocal, searchRemote, termsOf } from '../lib/search'
import Favicon from './Favicon'

const Marked = ({ text, terms }) =>
  highlight(text, terms).map((p, i) =>
    p.hit ? <mark key={i} className="rounded-[2px] bg-clay/20 text-inherit">{p.text}</mark> : <span key={i}>{p.text}</span>)

export default function SearchPalette({ onClose }) {
  const lib = useLibrary()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState([])
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef(null)
  const seq = useRef(0)

  const q = query.trim()
  const terms = termsOf(q)
  const savable = q && !/\s/.test(q) && /\./.test(q) && normalizeUrl(q)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Ranked search in the database (debounced); in-memory search in preview builds.
  useEffect(() => {
    setActive(0); setFailed(false)
    if (!q || !supabase) { setRemote([]); setPending(false); return }
    setPending(true)
    const mine = ++seq.current
    const timer = setTimeout(async () => {
      try {
        const rows = await searchRemote(q)
        if (mine === seq.current) setRemote(rows)
      } catch { if (mine === seq.current) { setRemote([]); setFailed(true) } }
      if (mine === seq.current) setPending(false)
    }, 160)
    return () => clearTimeout(timer)
  }, [q])

  const linkHits = useMemo(() => {
    if (!q) {
      const recent = [...lib.links]
        .sort((a, b) => new Date(b.opened_at ?? b.created_at) - new Date(a.opened_at ?? a.created_at))
        .slice(0, 6)
      return recent.map((link) => ({ link, matched: [] }))
    }
    return supabase ? remote : searchLocal(lib.searchable, q, lib)
  }, [q, remote, lib])

  const jumps = useMemo(() => {
    if (!q) return []
    const has = (name) => terms.every((t) => name.toLowerCase().includes(t))
    return [
      ...lib.collections.filter((c) => has(c.name)).slice(0, 3).map((c) => ({ kind: 'collection', item: c })),
      ...lib.tags.filter((t) => has(t.name)).slice(0, 3).map((t) => ({ kind: 'tag', item: t })),
    ]
  }, [q, terms, lib.collections, lib.tags])

  // One flat list so the arrow keys move through everything in order.
  // A collection or tag whose name is exactly what you typed goes first.
  const rows = useMemo(() => {
    const exact = (j) => j.item.name.toLowerCase() === q.toLowerCase()
    return [
      ...(savable ? [{ kind: 'save', url: savable }] : []),
      ...jumps.filter(exact),
      ...linkHits.map((h) => ({ kind: 'link', ...h })),
      ...jumps.filter((j) => !exact(j)),
    ]
  }, [savable, linkHits, jumps, q])

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (row) => {
    if (!row) return
    if (row.kind === 'link') {
      window.open(row.link.url, '_blank', 'noopener,noreferrer')
      lib.opened(row.link)
    } else if (row.kind === 'collection') navigate(`/app/c/${row.item.id}`)
    else if (row.kind === 'tag') navigate(`/app/tag/${encodeURIComponent(row.item.name)}`)
    else if (row.kind === 'save') navigate(`/app?save=${encodeURIComponent(row.url)}`)
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(rows[active]) }
  }

  const reason = ({ link, matched }) => {
    if (matched.includes('note') && link.note) return <>Note: <Marked text={excerpt(link.note, terms, 90)} terms={terms} /></>
    if (matched.includes('description') && (link.description || link.summary))
      return <Marked text={excerpt(link.description || link.summary, terms, 100)} terms={terms} />
    if (matched.includes('tag')) {
      const t = lib.tagsOf(link.id).filter((x) => terms.some((w) => x.name.includes(w)))
      if (t.length) return <>Tagged {t.map((x) => `#${x.name}`).join(' ')}</>
    }
    if (matched.includes('collection')) {
      const c = lib.collectionsOf(link.id).filter((x) => terms.some((w) => x.name.toLowerCase().includes(w)))
      if (c.length) return <>In {c.map((x) => x.name).join(', ')}</>
    }
    return [link.domain, intentLabel(link.intent), timeAgo(link.created_at)].filter(Boolean).join(' · ')
  }

  const iconWrap = 'flex h-4 w-4 shrink-0 items-center justify-center text-mute'
  let i = -1
  const rowClass = (on) => `flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${on ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.04]'}`
  const nothing = q && !pending && !failed && rows.length === 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="enter relative mx-auto mt-4 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-paper md:mt-[11vh] md:max-h-[70dvh]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search size={19} strokeWidth={1.5} className="text-mute" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            role="combobox" aria-expanded="true" aria-controls="search-results"
            aria-activedescendant={rows[active] ? `sr-${active}` : undefined}
            autoCapitalize="none" autoCorrect="off" spellCheck="false"
            placeholder="Search everything you’ve saved"
            className="min-w-0 flex-1 bg-transparent text-[16.5px] outline-none placeholder:text-mute/70" />
          <button onClick={onClose} className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] text-mute hover:text-ink">Esc</button>
        </div>

        <div ref={listRef} id="search-results" role="listbox" className="overflow-y-auto p-2">
          {!q && rows.length > 0 && <p className="px-3 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute">Recent</p>}
          {!q && rows.length === 0 && <p className="px-3 py-6 text-[15px] text-mute">Nothing saved yet. Paste a link on your library page to start.</p>}

          {rows.map((row) => {
            i += 1
            const idx = i
            const on = idx === active
            const common = { id: `sr-${idx}`, 'data-i': idx, role: 'option', 'aria-selected': on,
              onMouseMove: () => setActive(idx), onClick: () => choose(row), className: rowClass(on) }
            const heading = (label) => <p className="px-3 pb-1 pt-3 text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute">{label}</p>
            const firstJump = row.kind !== 'link' && row.kind !== 'save' && !['collection', 'tag'].includes(rows[idx - 1]?.kind)
            const firstLink = row.kind === 'link' && q && rows[idx - 1]?.kind !== 'link'

            if (row.kind === 'save') return (
              <button key={idx} {...common}>
                <span className={`${iconWrap} mt-0.5 text-clay`}><ArrowUpRight size={17} strokeWidth={1.5} /></span>
                <span className="min-w-0"><span className="block truncate text-[15px]">Save {row.url.replace(/^https?:\/\//, '')}</span>
                  <span className="block text-[12.5px] text-mute">Add it to your library</span></span>
              </button>
            )
            if (row.kind === 'link') return (
              <div key={idx}>
                {firstLink && heading('Links')}
                <button {...common}>
                  <span className="mt-1"><Favicon src={row.link.favicon_url} domain={row.link.domain} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px]"><Marked text={row.link.title || row.link.domain} terms={terms} /></span>
                    <span className="block truncate text-[12.5px] text-mute">{q ? reason(row) : [row.link.domain, timeAgo(row.link.opened_at ?? row.link.created_at)].join(' · ')}</span>
                  </span>
                  {q && row.link.title && row.link.title !== row.link.domain && (
                    <span className="hidden shrink-0 pt-0.5 text-[12.5px] text-mute sm:block">{row.link.domain}</span>
                  )}
                </button>
              </div>
            )
            return (
              <div key={idx}>
                {firstJump && heading('Go to')}
                <button {...common}>
                  {row.kind === 'collection'
                    ? <span className={`${iconWrap} mt-0.5`}><span className="h-3 w-3 rounded-[3px]" style={{ background: colorVar(row.item.color) }} /></span>
                    : <span className={`${iconWrap} mt-0.5`}><Hash size={16} strokeWidth={1.5} /></span>}
                  <span className="truncate text-[15px]">{row.item.name}</span>
                  <span className="ml-auto text-[12.5px] text-mute">{row.kind === 'collection' ? 'Collection' : 'Tag'}</span>
                </button>
              </div>
            )
          })}

          {nothing && <p className="px-3 py-6 text-[15px] text-mute">Nothing matches “{q}”. Try fewer words, or part of a word.</p>}
          {failed && <p className="px-3 py-6 text-[15px] text-mute">Search isn’t reachable right now. Try again in a moment.</p>}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[12px] text-mute">
          <span className="hidden sm:inline">↑ ↓ to move · Enter to open · Esc to close</span>
          <span className="sm:ml-auto">{pending ? 'Searching…' : q ? `${linkHits.length} link${linkHits.length === 1 ? '' : 's'}` : ''}</span>
        </div>
      </div>
    </div>
  )
}
