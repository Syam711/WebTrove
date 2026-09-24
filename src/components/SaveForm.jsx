import { useEffect, useRef, useState } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { INTENTS, intentLabel } from '../lib/intents'
import { domainOf, normalizeUrl } from '../lib/links'

/**
 * The "save a link" form. Appears at the top of Library when scoped to all links,
 * or embedded in other places. Shows the URL and lets you pick intent + title + note
 * before saving. Title is optional — if you don't set one, enrichment will try to fetch it.
 */
export default function SaveForm({ onSaved, collectionId }) {
  const lib = useLibrary()
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [intent, setIntent] = useState('other')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!input.trim()) { setPreview(null); return }
    const clean = normalizeUrl(input)
    if (!clean) { setPreview(null); return }
    setPreview({ url: clean, domain: domainOf(clean) })
    setTitle('')
    setNote('')
  }, [input])

  const submit = async (e) => {
    e.preventDefault()
    if (!preview) return
    setSaving(true)
    const res = await lib.add({ url: preview.url, intent, title: title || undefined, note: note || undefined, collectionId })
    setSaving(false)
    if (!res.duplicate) {
      setInput('')
      inputRef.current?.focus()
      onSaved?.()
      lib.flash({ text: `Saved ${preview.domain}.`, action: res.tempId && { label: 'Undo', run: () => lib.trash({ id: res.tempId }) } })
    }
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label className="flex items-center gap-3 rounded-md border border-line bg-raised px-4 py-3 transition-colors focus-within:border-ink">
        <Paperclip size={18} strokeWidth={1.5} className="shrink-0 text-mute" />
        <input ref={inputRef} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
          placeholder="Paste a link to save, or filter what's here" spellCheck="false"
          value={input} onChange={(e) => setInput(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-mute/60" />
      </label>

      {preview && (
        <div className="enter mt-4 space-y-4 rounded-md border border-line bg-raised p-5">
          <p className="text-[13px] text-mute">{preview.domain}</p>

          <div className="space-y-2">
            <label htmlFor="title" className="block text-[12.5px] font-medium uppercase tracking-[0.08em] text-mute">
              Give it a name <span className="font-normal">(optional — we'll try to find one)</span>
            </label>
            <input id="title" type="text" placeholder={preview.domain} value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-[15.5px] outline-none placeholder:text-mute/60 focus:border-ink" />
          </div>

          <div className="space-y-2">
            <label htmlFor="intent" className="block text-[12.5px] font-medium uppercase tracking-[0.08em] text-mute">
              What's this for?
            </label>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setIntent(key)} aria-pressed={intent === key}
                  className={`rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${intent === key ? 'border-ink bg-ink text-paper' : 'border-line text-mute hover:border-ink hover:text-ink'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="note" className="block text-[12.5px] font-medium uppercase tracking-[0.08em] text-mute">
              A quick note <span className="font-normal">(why you're saving it)</span>
            </label>
            <textarea id="note" rows={2} placeholder="Why this one matters to you" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-md border border-line bg-paper px-3 py-2.5 text-[15.5px] outline-none placeholder:text-mute/60 focus:border-ink" />
          </div>

          <div className="flex items-center gap-3 border-t border-dashed border-line pt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-md bg-clay px-4 py-2.5 text-[15px] font-medium text-on-clay transition-colors hover:bg-clay-deep disabled:opacity-50">
              <Send size={16} strokeWidth={1.5} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setInput(''); setPreview(null); setTitle(''); setNote('') }}
              className="text-[14.5px] text-mute underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
