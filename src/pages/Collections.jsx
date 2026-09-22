import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { colorVar } from '../lib/colors'
import CollectionForm from '../components/CollectionForm'

// The phone's way in to collections (on wider screens they live in the sidebar).
export default function Collections() {
  const lib = useLibrary()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <h1 className="font-serif text-[38px] tracking-tight">Collections<span className="text-clay">.</span></h1>
      <ul className="mt-8 border-t border-line">
        {lib.collections.map((c) => (
          <li key={c.id} className="border-b border-line">
            <Link to={`/app/c/${c.id}`} className="flex items-center gap-3 py-3.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: colorVar(c.color) }} />
              <span className="flex-1 text-[16px]">{c.name}</span>
              <span className="text-[13px] text-mute">{lib.collectionCount[c.id] || 0}</span>
            </Link>
          </li>
        ))}
      </ul>
      {lib.collections.length === 0 && !creating && (
        <p className="mt-6 text-[15px] leading-relaxed text-mute">Group links by whatever you’re working on.</p>
      )}
      <div className="mt-5">
        {creating ? (
          <CollectionForm onCancel={() => setCreating(false)}
            onSubmit={async (name, color) => {
              const res = await lib.createCollection(name, color)
              if (res.collection) navigate(`/app/c/${res.collection.id}`)
              return res
            }} />
        ) : (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-[15px] text-ink underline decoration-line underline-offset-4">
            <Plus size={16} strokeWidth={1.5} /> New collection
          </button>
        )}
      </div>
    </>
  )
}
