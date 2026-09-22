import { useState } from 'react'
import { Trash2, Undo2 } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { useView } from '../lib/view'
import { timeAgo } from '../lib/time'
import LinkGrid, { ViewSwitch } from '../components/LinkGrid'

export default function Trash() {
  const lib = useLibrary()
  const [view, setView] = useView()
  const [confirmAll, setConfirmAll] = useState(false)
  const n = lib.trashed.length

  const actions = [
    { key: 'restore', label: 'Put back', icon: Undo2, run: (l) => lib.restore(l) },
    { key: 'purge', label: 'Delete for good', icon: Trash2, confirm: 'Delete for good?', run: (l) => lib.purge(l) },
  ]

  return (
    <>
      <h1 className="font-serif text-[38px] leading-tight tracking-tight md:text-[46px]">Trash<span className="text-clay">.</span></h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
        Put back anything that landed here by mistake. Deleting from here is permanent.
      </p>

      <section className="mt-10">
        {n > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-dashed border-line pb-3">
            <p className="text-[13.5px] text-mute">{n} link{n === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-4">
              {confirmAll ? (
                <span className="flex items-center gap-3 text-[13.5px]">
                  <button onClick={() => { lib.emptyTrash(); setConfirmAll(false) }} className="font-medium text-clay">Yes, delete all {n}</button>
                  <button onClick={() => setConfirmAll(false)} className="text-mute hover:text-ink">Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirmAll(true)} className="text-[13.5px] text-mute underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
                  Empty trash
                </button>
              )}
              <ViewSwitch view={view} onView={setView} />
            </div>
          </div>
        )}

        {lib.loading && <p className="text-[15px] text-mute">Opening the trash…</p>}
        {!lib.loading && n === 0 && (
          <div className="border-t border-dashed border-line pt-10">
            <h2 className="font-serif text-[26px] italic text-mute">The trash is empty.</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mute">Links you remove will wait here until you delete them for good.</p>
          </div>
        )}
        {n > 0 && (
          <LinkGrid links={lib.trashed} view={view} actions={actions} copy={false}
            noteFor={(l) => `Removed ${timeAgo(l.deleted_at)}`} />
        )}
      </section>
    </>
  )
}
