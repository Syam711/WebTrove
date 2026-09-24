import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'

/**
 * A slide-in panel for renaming a link. Opens when you click the title on a card.
 * Lets you give it a better name, or clear it to let enrichment find one automatically.
 */
export default function EditTitleSheet({ link, onClose }) {
  const lib = useLibrary()
  const [title, setTitle] = useState(link?.title || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [link])

  const save = async () => {
    if (title === link.title) return onClose()
    setSaving(true)
    await lib.updateLink(link.id, { title: title || null })
    setSaving(false)
    onClose()
    lib.flash({ text: `Renamed to "${title || link.domain}".` })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => onClose()}>
      <div onClick={(e) => e.stopPropagation()} className="enter w-full max-w-md rounded-t-lg bg-paper sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-serif text-[20px]">Rename</h2>
          <button onClick={() => onClose()} className="rounded-md p-1 text-mute hover:bg-ink/[0.06] hover:text-ink">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-[13px] text-mute">{link.domain}</p>
          <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Leave blank to auto-detect from the page" 
            className="w-full rounded-md border border-line bg-raised px-3 py-3 text-[15.5px] outline-none placeholder:text-mute/60 focus:border-ink" />

          <div className="flex items-center gap-3 border-t border-dashed border-line pt-4">
            <button onClick={save} disabled={saving} className="rounded-md bg-clay px-4 py-2.5 text-[15px] font-medium text-on-clay hover:bg-clay-deep disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => onClose()} className="text-[14.5px] text-mute underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
