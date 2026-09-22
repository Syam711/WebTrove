import { LayoutGrid, List } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { LinkCard, LinkRow } from './LinkCard'

/** The cards / list switch. */
export function ViewSwitch({ view, onView }) {
  return (
    <div className="flex gap-1">
      {[['cards', LayoutGrid, 'Cards'], ['list', List, 'List']].map(([key, Icon, label]) => (
        <button key={key} onClick={() => onView(key)} aria-label={`${label} view`} aria-pressed={view === key}
          className={`rounded-md p-1.5 transition-colors ${view === key ? 'bg-ink/[0.07] text-ink' : 'text-mute hover:text-ink'}`}>
          <Icon size={17} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  )
}

/** "12 links" on the left, the switch on the right. */
export function ViewBar({ text, view, onView }) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-dashed border-line pb-3">
      <p className="text-[13.5px] text-mute">{text}</p>
      <ViewSwitch view={view} onView={onView} />
    </div>
  )
}

/** The links themselves, as masonry cards or a compact list. */
export default function LinkGrid({ links, view, actions, copy, noteFor, onOpen, onRetry }) {
  const lib = useLibrary()
  if (view === 'list') {
    return (
      <ul className="border-t border-line">
        {links.map((l) => <LinkRow key={l.id} link={l} actions={actions} copy={copy} note={noteFor?.(l)} onOpen={onOpen} />)}
      </ul>
    )
  }
  return (
    <div className="columns-1 gap-4 md:columns-2">
      {links.map((l) => (
        <LinkCard key={l.id} link={l} tags={lib.tagsOf(l.id)} collections={lib.collectionsOf(l.id)}
          actions={actions} copy={copy} note={noteFor?.(l)} onOpen={onOpen} onRetry={onRetry} />
      ))}
    </div>
  )
}
