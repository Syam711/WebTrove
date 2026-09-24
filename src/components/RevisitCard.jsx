import { useEffect, useState } from 'react'
import { Archive, ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { supabase } from '../lib/supabase'
import { rediscoverLocal, rediscoverRemote } from '../lib/rediscover'
import { intentLabel } from '../lib/intents'
import { timeAgo } from '../lib/time'
import Favicon from './Favicon'

const dayMs = 86400000
const SNOOZE_KEY = 'recall-revisit-hidden-until'

const since = (link) => {
  const from = link.opened_at ?? link.created_at
  const days = Math.round((Date.now() - new Date(from).getTime()) / dayMs)
  return link.opened_at ? `Saved ${timeAgo(link.created_at)} · last opened ${timeAgo(link.opened_at)}`
    : days >= 30 ? `Saved ${timeAgo(link.created_at)}, never opened` : `Saved ${timeAgo(link.created_at)}`
}

/** A short shelf of links worth coming back to. Quiet, dismissible, never insistent. */
export default function RevisitCard() {
  const lib = useLibrary()
  const [items, setItems] = useState(null)
  const [i, setI] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const rows = supabase ? await rediscoverRemote(4) : rediscoverLocal(lib.links, 4)
        if (live) setItems(rows)
      } catch { if (live) setItems([]) }
    })()
    return () => { live = false }
    // Refreshes when the shape of the library changes underneath it, not on every keystroke elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib.links.length])

  const snooze = (days) => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * dayMs)) } catch { /* storage unavailable */ }
    setHidden(true)
  }
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
      if (until > Date.now()) setHidden(true)
    } catch { /* storage unavailable */ }
  }, [])

  if (hidden || !items || items.length === 0) return null
  const link = items[i]

  const openIt = () => { lib.opened(link); window.open(link.url, '_blank', 'noopener,noreferrer') }
  const archiveIt = () => {
    lib.archive(link, true)
    lib.flash({ text: 'Archived.', action: { label: 'Undo', run: () => lib.archive(link, false) } })
    setItems((prev) => prev.filter((l) => l.id !== link.id))
    setI((n) => Math.min(n, Math.max(items.length - 2, 0)))
  }

  return (
    <section className="enter mb-10 rounded-md border border-line bg-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute">Worth another look</p>
        <button onClick={() => snooze(7)} aria-label="Hide for a week" title="Hide for a week"
          className="-mr-1.5 -mt-1 rounded-md p-1 text-mute hover:bg-ink/[0.06] hover:text-ink">
          <X size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-3 flex items-start gap-4">
        <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => lib.opened(link)} className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[12.5px] text-mute">
            <Favicon src={link.favicon_url} domain={link.domain} /> {link.domain}
          </p>
          <h3 className="mt-1.5 font-serif text-[20px] leading-snug">{link.title || link.domain}</h3>
          {link.note && <p className="mt-1 font-serif text-[14.5px] italic leading-snug text-mute">“{link.note}”</p>}
          <p className="mt-2 text-[13px] text-mute">
            {[intentLabel(link.intent), since(link)].filter(Boolean).join(' · ')}
          </p>
        </a>
        <ArrowUpRight size={18} strokeWidth={1.5} className="mt-1 shrink-0 text-mute" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-3">
        <div className="flex items-center gap-1">
          <button onClick={openIt} className="rounded-md bg-clay px-3.5 py-1.5 text-[13.5px] font-medium text-on-clay transition-colors hover:bg-clay-deep">
            Open
          </button>
          <button onClick={archiveIt} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] text-mute hover:bg-ink/[0.06] hover:text-ink">
            <Archive size={14} strokeWidth={1.5} /> Not this one
          </button>
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-2 text-mute">
            <button onClick={() => setI((n) => (n - 1 + items.length) % items.length)} aria-label="Previous" className="rounded-md p-1 hover:bg-ink/[0.06] hover:text-ink">
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-[12px]">{i + 1} / {items.length}</span>
            <button onClick={() => setI((n) => (n + 1) % items.length)} aria-label="Next" className="rounded-md p-1 hover:bg-ink/[0.06] hover:text-ink">
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
