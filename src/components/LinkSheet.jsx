import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { INTENTS } from '../lib/intents'
import { COLORS, colorVar } from '../lib/colors'
import Favicon from './Favicon'

const label = 'text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute'

/** Everything about one link that you can change: why, note, collections, tags. */
export default function LinkSheet({ link, onClose }) {
  const lib = useLibrary()
  const [note, setNote] = useState(link.note ?? '')
  const [tagInput, setTagInput] = useState('')
  const [newCollection, setNewCollection] = useState('')
  const [collError, setCollError] = useState('')
  const closeRef = useRef(null)

  const flushNote = () => {
    const next = note.trim() || null
    if (next !== (link.note ?? null)) lib.updateLink(link.id, { note: next })
  }
  const close = () => { flushNote(); onClose() }

  const closeFn = useRef(close)
  closeFn.current = close
  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeFn.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])

  const myTags = lib.tagsOf(link.id)
  const mine = new Set(myTags.map((t) => t.id))
  const suggestions = lib.popularTags.filter((t) => !mine.has(t.id)).slice(0, 6)
  const inCollections = new Set(lib.linkCollections[link.id] || [])

  const commitTag = () => { if (tagInput.trim()) lib.addTag(link.id, tagInput); setTagInput('') }
  const createAndAdd = async (e) => {
    e.preventDefault()
    const res = await lib.createCollection(newCollection, COLORS[lib.collections.length % COLORS.length])
    if (res.error) return setCollError(res.error)
    lib.toggleCollection(link.id, res.collection.id, true)
    setNewCollection(''); setCollError('')
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Organize link">
      <div className="absolute inset-0 bg-ink/30" onClick={close} />
      <div className="enter absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-lg border-t border-line bg-paper px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[27rem] md:rounded-none md:border-l md:border-t-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12.5px] text-mute">
              <Favicon src={link.favicon_url} domain={link.domain} /> {link.domain}
            </p>
            <h2 className="mt-2 font-serif text-[24px] leading-snug">{link.title || link.domain}</h2>
          </div>
          <button ref={closeRef} onClick={close} aria-label="Close" className="-mr-2 rounded-md p-2 text-mute hover:bg-ink/[0.06] hover:text-ink">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <section className="mt-7">
          <h3 className={label}>Why you saved it</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTENTS.map(([key, text]) => (
              <button key={key} type="button" aria-pressed={link.intent === key}
                onClick={() => lib.updateLink(link.id, { intent: link.intent === key ? 'other' : key })}
                className={`rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${
                  link.intent === key ? 'border-ink bg-ink text-paper' : 'border-line text-mute hover:border-ink hover:text-ink'}`}>
                {text}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={flushNote}
            rows={2} maxLength={200} placeholder="A line to remember it by"
            className="mt-3 w-full resize-none rounded-md border border-line bg-raised px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-mute/70 focus:border-ink" />
        </section>

        <section className="mt-7 border-t border-dashed border-line pt-6">
          <h3 className={label}>Collections</h3>
          <ul className="mt-2">
            {lib.collections.map((c) => {
              const on = inCollections.has(c.id)
              return (
                <li key={c.id}>
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => lib.toggleCollection(link.id, c.id)}
                    className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[15px] transition-colors hover:bg-ink/[0.04]">
                    <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: colorVar(c.color) }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border ${on ? 'border-ink bg-ink text-paper' : 'border-line'}`}>
                      {on && <Check size={13} strokeWidth={2.25} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <form onSubmit={createAndAdd} className="mt-2 flex items-center gap-2">
            <Plus size={16} strokeWidth={1.5} className="ml-1 text-mute" />
            <input value={newCollection} onChange={(e) => { setNewCollection(e.target.value); setCollError('') }}
              maxLength={60} placeholder="New collection"
              className="min-w-0 flex-1 bg-transparent py-2 text-[14.5px] outline-none placeholder:text-mute/70" />
          </form>
          {collError && <p role="alert" className="mt-1 text-[13px] text-clay">{collError}</p>}
        </section>

        <section className="mt-6 border-t border-dashed border-line pt-6">
          <h3 className={label}>Tags</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {myTags.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-sm border border-line bg-raised py-1 pl-2.5 pr-1 text-[13.5px]">
                #{t.name}
                <button onClick={() => lib.removeTag(link.id, t.id)} aria-label={`Remove ${t.name}`}
                  className="rounded-sm p-0.5 text-mute hover:text-ink"><X size={13} strokeWidth={1.75} /></button>
              </span>
            ))}
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} maxLength={40}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitTag() } }}
              onBlur={commitTag} placeholder={myTags.length ? 'Add another' : 'Add a tag'}
              className="min-w-[7rem] flex-1 bg-transparent py-1.5 text-[14.5px] outline-none placeholder:text-mute/70" />
          </div>
          {suggestions.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
              Used before:
              {suggestions.map((t) => (
                <button key={t.id} onClick={() => lib.addTag(link.id, t.name)} className="hover:text-ink">#{t.name}</button>
              ))}
            </p>
          )}
        </section>

        <button onClick={close}
          className="mt-8 w-full rounded-md bg-clay px-4 py-2.5 text-[15px] font-medium text-on-clay transition-colors hover:bg-clay-deep">
          Done
        </button>
      </div>
    </div>
  )
}
