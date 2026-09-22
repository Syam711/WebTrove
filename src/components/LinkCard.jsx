import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import Favicon from './Favicon'
import { colorVar } from '../lib/colors'
import { intentLabel } from '../lib/intents'
import { timeAgo } from '../lib/time'

const iconBtn = 'rounded-md p-1.5 text-mute transition-colors hover:bg-ink/[0.06] hover:text-ink'

function useCopy(text) {
  const [done, setDone] = useState(false)
  return [done, async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400) } catch { /* clipboard blocked */ }
  }]
}

/**
 * Small icon buttons for a link. An action with `confirm` asks a second time before it runs,
 * so nothing irreversible happens on a single tap.
 */
function Actions({ link, actions = [], copy = true, className = '' }) {
  const [copied, doCopy] = useCopy(link.url)
  const [confirming, setConfirming] = useState(null)
  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(null), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  return (
    <span className={`flex items-center opacity-100 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${confirming ? 'md:!opacity-100' : ''} ${className}`}>
      {actions.map((a) => {
        const Icon = a.icon
        if (a.confirm && confirming === a.key) {
          return (
            <button key={a.key} onClick={() => { setConfirming(null); a.run(link) }}
              className="rounded-md px-2 py-1 text-[12.5px] font-medium text-clay hover:bg-clay/10">
              {a.confirm}
            </button>
          )
        }
        return (
          <button key={a.key} className={iconBtn} aria-label={a.label} title={a.label}
            onClick={() => (a.confirm ? setConfirming(a.key) : a.run(link))}>
            <Icon size={16} strokeWidth={1.5} />
          </button>
        )
      })}
      {copy && (
        <button className={iconBtn} onClick={doCopy} aria-label="Copy link" title="Copy link">
          {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
        </button>
      )}
    </span>
  )
}

function Status({ link, onRetry }) {
  if (link.enrich_status === 'failed')
    return (
      <p className="mt-1.5 text-[13.5px] text-mute">
        Couldn’t read this page.{' '}
        <button onClick={() => onRetry(link.id)} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          Try again
        </button>
      </p>
    )
  // Links that already have a title (imports) read their pages quietly in the background.
  if ((link.enrich_status === 'pending' || link.enrich_status === 'processing') && !link.title)
    return (
      <p className="mt-1.5 flex items-center gap-2 text-[13.5px] text-mute">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" /> Reading the page…
      </p>
    )
  return null
}

export function LinkCard({ link, tags = [], collections = [], actions, copy = true, note, onOpen, onRetry }) {
  const [imgOk, setImgOk] = useState(true)
  const footer = note ?? [intentLabel(link.intent), timeAgo(link.created_at)].filter(Boolean).join(' · ')

  return (
    <article className="enter group mb-4 break-inside-avoid rounded-md border border-line bg-raised p-5">
      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(link)} className="block">
        {link.image_url && imgOk && (
          <img src={link.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)}
            className="mb-4 h-36 w-full rounded-sm border border-line object-cover" />
        )}
        <p className="flex items-center gap-2 text-[12.5px] text-mute">
          <Favicon src={link.favicon_url} domain={link.domain} /> {link.domain}
        </p>
        <h3 className="mt-2.5 font-serif text-[21px] leading-snug">{link.title || link.domain}</h3>
        {link.description && (
          <p className="mt-1.5 line-clamp-3 text-[14px] leading-relaxed text-mute">{link.description}</p>
        )}
      </a>
      <Status link={link} onRetry={onRetry} />
      {link.note && <p className="mt-3 font-serif text-[15px] italic leading-snug">“{link.note}”</p>}
      {(collections.length > 0 || tags.length > 0) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
          {collections.map((c) => (
            <Link key={c.id} to={`/app/c/${c.id}`} className="inline-flex items-center gap-1.5 hover:text-ink">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: colorVar(c.color) }} /> {c.name}
            </Link>
          ))}
          {tags.map((t) => (
            <Link key={t.id} to={`/app/tag/${encodeURIComponent(t.name)}`} className="hover:text-ink">#{t.name}</Link>
          ))}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-2.5 text-[12.5px] text-mute">
        <span>{footer}</span>
        <Actions link={link} actions={actions} copy={copy} className="-mr-1.5" />
      </div>
    </article>
  )
}

export function LinkRow({ link, actions, copy = false, note, onOpen }) {
  const meta = note ?? [intentLabel(link.intent), timeAgo(link.created_at)].filter(Boolean).join(' · ')
  return (
    <li className="enter group flex items-center gap-3 border-b border-line py-3">
      <Favicon src={link.favicon_url} domain={link.domain} />
      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(link)} className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px]">{link.title || link.domain}</span>
        <span className="block truncate text-[12.5px] text-mute">{link.domain} · {meta}</span>
      </a>
      <Actions link={link} actions={actions} copy={copy} />
    </li>
  )
}
