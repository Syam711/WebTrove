import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Archive, ArrowUpRight, Search, Tags, Trash2 } from 'lucide-react'
import { INTENTS } from '../lib/intents'
import { normalizeUrl } from '../lib/links'
import { colorVar } from '../lib/colors'
import { supabase } from '../lib/supabase'
import { useLibrary } from '../context/LibraryContext'
import LinkGrid, { ViewBar } from '../components/LinkGrid'
import { useView } from '../lib/view'
import LinkSheet from '../components/LinkSheet'

const looksLikeUrl = (v) => v !== '' && normalizeUrl(v) !== null && !/\s/.test(v) && /\./.test(v)

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Library() {
  const lib = useLibrary()
  const { collectionId, tagName: rawTag } = useParams()
  const tagName = rawTag ? decodeURIComponent(rawTag) : null
  const collection = collectionId ? lib.collectionById[collectionId] : null
  const tag = tagName ? lib.tags.find((t) => t.name === tagName) : null

  const [value, setValue] = useState('')
  const [intent, setIntent] = useState('learn')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useView()
  const [sheetId, setSheetId] = useState(null)
  const input = useRef(null)

  const scopeKey = collectionId ?? (tagName ? `tag:${tagName}` : 'all')
  useEffect(() => { setValue(''); setNote(''); setMessage('') }, [scopeKey])

  const trimmed = value.trim()
  const saving = looksLikeUrl(trimmed)

  // "Save this link" from the search palette lands here with the address filled in.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const incoming = params.get('save')
    if (!incoming) return
    setValue(incoming)
    setParams({}, { replace: true })
    input.current?.focus()
  }, [params, setParams])

  // What this page is about: everything, one collection, or one tag.
  const scoped = useMemo(() => {
    if (collectionId) return lib.links.filter((l) => (lib.linkCollections[l.id] || []).includes(collectionId))
    if (tagName) return tag ? lib.links.filter((l) => (lib.linkTags[l.id] || []).includes(tag.id)) : []
    return lib.links
  }, [lib.links, lib.linkCollections, lib.linkTags, collectionId, tagName, tag])

  // Until ranked search arrives (step 4), typing simply narrows what's on screen.
  const visible = useMemo(() => {
    if (!trimmed || saving) return scoped
    const q = trimmed.toLowerCase()
    return scoped.filter((l) => {
      const tagText = lib.tagsOf(l.id).map((t) => t.name).join(' ')
      return [l.title, l.domain, l.url, l.note, l.description, tagText].some((f) => f?.toLowerCase().includes(q))
    })
  }, [scoped, trimmed, saving, lib])

  const submit = async (e) => {
    e.preventDefault()
    if (!saving) return
    const res = await lib.add({ url: trimmed, intent, note, collectionId: collection?.id })
    if (res.ok) { setValue(''); setNote(''); setMessage(''); input.current?.focus() }
    else if (res.duplicate) setMessage('You’ve already saved this one.')
    else setMessage(res.error)
  }

  const actions = [
    { key: 'organize', label: 'Collections and tags', icon: Tags, run: (l) => setSheetId(l.id) },
    { key: 'archive', label: 'Archive', icon: Archive, run: (l) => {
        lib.archive(l, true)
        lib.flash({ text: 'Archived.', action: { label: 'Undo', run: () => lib.archive(l, false) } })
      } },
    { key: 'trash', label: 'Move to trash', icon: Trash2, run: (l) => {
        lib.trash(l)
        lib.flash({ text: 'Moved to trash.', action: { label: 'Undo', run: () => lib.restore(l) } })
      } },
  ]

  const sheetLink = sheetId ? lib.allLinks.find((l) => l.id === sheetId) : null
  const missingScope = !lib.loading && ((collectionId && !collection) || (tagName && !tag))
  const empty = scoped.length === 0

  return (
    <>
      {collection ? (
        <h1 className="flex items-center gap-3.5 font-serif text-[36px] leading-tight tracking-tight md:text-[44px]">
          <span className="mt-1 h-5 w-5 shrink-0 rounded-[5px]" style={{ background: colorVar(collection.color) }} />
          {collection.name}
        </h1>
      ) : tagName ? (
        <h1 className="font-serif text-[36px] leading-tight tracking-tight md:text-[44px]">
          <span className="text-mute">#</span>{tagName}
        </h1>
      ) : (
        <h1 className="font-serif text-[38px] leading-tight tracking-tight md:text-[46px]">
          {greeting()}<span className="text-clay">.</span>
        </h1>
      )}

      {missingScope ? (
        <p className="mt-6 text-[15px] text-mute">
          That {collectionId ? 'collection' : 'tag'} isn’t here.{' '}
          <Link to="/app" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Back to your library</Link>
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="mt-8">
            <label className="flex items-center gap-3 rounded-md border border-line bg-raised px-4 py-3 transition-colors focus-within:border-ink">
              {saving ? <ArrowUpRight size={19} strokeWidth={1.5} className="text-clay" />
                      : <Search size={19} strokeWidth={1.5} className="text-mute" />}
              <input ref={input} value={value} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                onChange={(e) => { setValue(e.target.value); setMessage('') }}
                placeholder={collection ? `Paste a link to add to ${collection.name}, or filter` : 'Paste a link to save, or filter what’s here'}
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-mute/70" />
            </label>

            {saving && (
              <div className="enter mt-4">
                <p className="text-[13.5px] text-mute">What’s it for?</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {INTENTS.map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setIntent(key)} aria-pressed={intent === key}
                      className={`rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${
                        intent === key ? 'border-ink bg-ink text-paper' : 'border-line text-mute hover:border-ink hover:text-ink'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                    placeholder="A line to remember it by (optional)"
                    className="min-w-0 flex-1 rounded-md border border-line bg-raised px-3.5 py-2 text-[14.5px] outline-none placeholder:text-mute/70 focus:border-ink" />
                  <button type="submit"
                    className="rounded-md bg-clay px-5 py-2 text-[14.5px] font-medium text-on-clay transition-colors hover:bg-clay-deep">
                    Save
                  </button>
                </div>
              </div>
            )}
            {message && <p role="alert" className="mt-3 text-[13.5px] text-clay">{message}</p>}
          </form>

          {!supabase && (
            <p className="mt-6 text-[13px] text-mute">
              Preview mode: links you save here live in this tab only and disappear on refresh.
            </p>
          )}

          {!collectionId && !tagName && lib.popularTags.length > 0 && (
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-mute">
              {lib.popularTags.map((t) => (
                <Link key={t.id} to={`/app/tag/${encodeURIComponent(t.name)}`} className="hover:text-ink">
                  #{t.name} <span className="text-mute/70">{lib.tagCount?.[t.id]}</span>
                </Link>
              ))}
            </p>
          )}

          <section className="mt-10">
            {!empty && (
              <ViewBar view={view} onView={setView}
                text={`${trimmed && !saving ? `${visible.length} of ${scoped.length}` : scoped.length} link${scoped.length === 1 ? '' : 's'}`} />
            )}

            {lib.loading && <p className="text-[15px] text-mute">Opening your library…</p>}
            {lib.error && (
              <p className="text-[15px] text-mute">
                {lib.error}{' '}
                <button onClick={lib.reload} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">Retry</button>
              </p>
            )}

            {!lib.loading && !lib.error && empty && (
              <div className="border-t border-dashed border-line pt-10">
                <h2 className="font-serif text-[26px] italic text-mute">
                  {collection ? 'Nothing in here yet.' : tagName ? 'Nothing carries this tag.' : 'Nothing saved yet.'}
                </h2>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mute">
                  {collection
                    ? 'Paste a link above and it will land here, or add existing links from the tag icon on any card.'
                    : tagName
                    ? 'Add this tag to a link from the tag icon on its card.'
                    : 'Paste a link above and tell it why you’re keeping it. Later, it’ll be easier to find, and easier to remember.'}
                </p>
                {!collectionId && !tagName && (
                  <p className="mt-4 text-[14.5px] text-mute">
                    Already have bookmarks?{' '}
                    <Link to="/app/import" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                      Bring them over
                    </Link>
                  </p>
                )}
              </div>
            )}

            {!empty && visible.length === 0 && <p className="text-[15px] text-mute">Nothing matches “{trimmed}”.</p>}

            {visible.length > 0 && (
              <LinkGrid links={visible} view={view} actions={actions} onOpen={lib.opened} onRetry={lib.retry} />
            )}
          </section>
        </>
      )}

      {sheetLink && <LinkSheet key={sheetLink.id} link={sheetLink} onClose={() => setSheetId(null)} />}
    </>
  )
}
