import { useState } from 'react'
import { ArchiveRestore, Tags, Trash2 } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { useView } from '../lib/view'
import LinkGrid, { ViewBar } from '../components/LinkGrid'
import LinkSheet from '../components/LinkSheet'

export default function Archive() {
  const lib = useLibrary()
  const [view, setView] = useView()
  const [sheetId, setSheetId] = useState(null)
  const sheetLink = sheetId ? lib.allLinks.find((l) => l.id === sheetId) : null

  const actions = [
    { key: 'organize', label: 'Collections and tags', icon: Tags, run: (l) => setSheetId(l.id) },
    { key: 'unarchive', label: 'Move back to library', icon: ArchiveRestore, run: (l) => {
        lib.archive(l, false)
        lib.flash({ text: 'Back in your library.', action: { label: 'Undo', run: () => lib.archive(l, true) } })
      } },
    { key: 'trash', label: 'Move to trash', icon: Trash2, run: (l) => {
        lib.trash(l)
        lib.flash({ text: 'Moved to trash.', action: { label: 'Undo', run: () => lib.restore(l) } })
      } },
  ]
  const n = lib.archived.length

  return (
    <>
      <h1 className="font-serif text-[38px] leading-tight tracking-tight md:text-[46px]">Archive<span className="text-clay">.</span></h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
        Links you want out of the way, but not gone. They still turn up in search.
      </p>

      <section className="mt-10">
        {n > 0 && <ViewBar view={view} onView={setView} text={`${n} link${n === 1 ? '' : 's'}`} />}
        {lib.loading && <p className="text-[15px] text-mute">Opening your archive…</p>}
        {!lib.loading && n === 0 && (
          <div className="border-t border-dashed border-line pt-10">
            <h2 className="font-serif text-[26px] italic text-mute">Nothing archived.</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mute">
              Use the archive icon on any link you’re done with but don’t want to lose.
            </p>
          </div>
        )}
        {n > 0 && <LinkGrid links={lib.archived} view={view} actions={actions} onOpen={lib.opened} onRetry={lib.retry} />}
      </section>

      {sheetLink && <LinkSheet key={sheetLink.id} link={sheetLink} onClose={() => setSheetId(null)} />}
    </>
  )
}
