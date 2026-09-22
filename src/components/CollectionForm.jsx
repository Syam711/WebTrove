import { useEffect, useRef, useState } from 'react'
import { COLORS, colorVar } from '../lib/colors'

/** Create or edit a collection: a name and a colour. */
export default function CollectionForm({ initial, onSubmit, onCancel, onDelete, submitLabel = 'Add' }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await onSubmit(name, color)
    setBusy(false)
    if (res?.error) setError(res.error)
  }

  return (
    <form onSubmit={submit} className="enter rounded-md border border-line bg-raised p-3.5"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <input ref={ref} value={name} maxLength={60} placeholder="Collection name"
        onChange={(e) => { setName(e.target.value); setError('') }}
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-mute/70" />
      <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Colour">
        {COLORS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c}
            onClick={() => setColor(c)}
            className={`h-5 w-5 rounded-[5px] transition-transform ${color === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-raised' : 'hover:scale-110'}`}
            style={{ background: colorVar(c) }} />
        ))}
      </div>
      {error && <p role="alert" className="mt-2.5 text-[13px] text-clay">{error}</p>}
      <div className="mt-3.5 flex items-center gap-3 text-[13.5px]">
        <button type="submit" disabled={busy || !name.trim()}
          className="rounded-md bg-clay px-3.5 py-1.5 font-medium text-on-clay transition-colors hover:bg-clay-deep disabled:opacity-50">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-mute hover:text-ink">Cancel</button>
        {onDelete && (
          <button type="button" onClick={() => (confirming ? onDelete() : setConfirming(true))}
            className="ml-auto text-mute hover:text-clay">
            {confirming ? 'Delete it? Links stay.' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  )
}
