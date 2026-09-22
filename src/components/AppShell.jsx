import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Archive, BookOpen, FolderClosed, LogOut, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LibraryProvider, useLibrary } from '../context/LibraryContext'
import { COLORS, colorVar } from '../lib/colors'
import Wordmark from './Wordmark'
import ThemeToggle from './ThemeToggle'
import CollectionForm from './CollectionForm'
import SearchPalette from './SearchPalette'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const NAV = [
  { to: '/app', label: 'Library', icon: BookOpen, end: true },
  { to: '/app/archive', label: 'Archive', icon: Archive },
  { to: '/app/trash', label: 'Trash', icon: Trash2 },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors ${
    isActive ? 'bg-ink/[0.06] text-ink' : 'text-mute hover:bg-ink/[0.04] hover:text-ink'
  }`

function SidebarCollections() {
  const lib = useLibrary()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  return (
    <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
      <p className="px-3 text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute">Collections</p>

      <ul className="mt-2 space-y-0.5">
        {lib.collections.map((c) => (
          <li key={c.id} className="group relative">
            {editing === c.id ? (
              <CollectionForm initial={c} submitLabel="Save" onCancel={() => setEditing(null)}
                onSubmit={async (name, color) => {
                  const res = await lib.updateCollection(c.id, { name, color })
                  if (!res.error) setEditing(null)
                  return res
                }}
                onDelete={async () => { await lib.deleteCollection(c.id); setEditing(null); navigate('/app') }} />
            ) : (
              <>
                <NavLink to={`/app/c/${c.id}`} className={linkClass}>
                  <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: colorVar(c.color) }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="text-[12.5px] text-mute/80 group-hover:hidden">{lib.collectionCount[c.id] || ''}</span>
                </NavLink>
                <button onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md p-1.5 text-mute hover:text-ink group-hover:block focus-visible:block">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {lib.collections.length === 0 && !creating && (
        <p className="mt-2 px-3 text-[14px] leading-relaxed text-mute">Group links by whatever you’re working on.</p>
      )}

      <div className="mt-2">
        {creating ? (
          <CollectionForm onCancel={() => setCreating(false)}
            onSubmit={async (name, color) => {
              const res = await lib.createCollection(name, color)
              if (res.collection) { setCreating(false); navigate(`/app/c/${res.collection.id}`) }
              return res
            }} />
        ) : (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            <Plus size={15} strokeWidth={1.5} /> New collection
          </button>
        )}
      </div>
    </div>
  )
}

function Shell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const who = user?.email ?? 'Preview'
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching((v) => !v) }
      else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
        e.preventDefault(); setSearching(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const phoneNav = [NAV[0], { to: '/app/collections', label: 'Collections', icon: FolderClosed }, NAV[1], NAV[2]]

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line bg-paper/70 px-4 py-6 backdrop-blur-[2px] md:flex">
        <Link to="/" className="px-3" title="About Web Trove"><Wordmark className="text-[26px]" /></Link>

        <button onClick={() => setSearching(true)}
          className="mt-6 flex w-full items-center gap-3 rounded-md border border-line bg-raised px-3 py-2 text-left text-[14.5px] text-mute transition-colors hover:border-ink hover:text-ink">
          <Search size={17} strokeWidth={1.5} /> <span className="flex-1">Search</span>
          <kbd className="font-sans text-[11.5px]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        <nav className="mt-6 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} strokeWidth={1.5} /> {label}
            </NavLink>
          ))}
        </nav>

        <SidebarCollections />

        <NavLink to="/app/import" className={linkClass}>
          <Upload size={18} strokeWidth={1.5} /> Import bookmarks
        </NavLink>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line px-3 pt-4">
          <span className="truncate text-[13px] text-mute" title={who}>{who}</span>
          <ThemeToggle className="ml-auto" />
          <button aria-label="Sign out" title="Sign out"
            onClick={async () => { await signOut(); navigate('/login') }}
            className="rounded-md p-1.5 text-mute transition-colors hover:bg-ink/[0.06] hover:text-ink">
            <LogOut size={17} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between px-5 pt-5 md:hidden">
        <Link to="/"><Wordmark className="text-[24px]" /></Link>
        <div className="flex items-center gap-1">
          <button aria-label="Search" onClick={() => setSearching(true)} className="rounded-md p-2 text-mute hover:text-ink">
            <Search size={19} strokeWidth={1.5} />
          </button>
          <ThemeToggle />
          <button aria-label="Sign out" onClick={async () => { await signOut(); navigate('/login') }}
            className="rounded-md p-2 text-mute hover:text-ink"><LogOut size={18} strokeWidth={1.5} /></button>
        </div>
      </header>

      <main className="min-w-0 px-5 pb-28 pt-6 md:px-12 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-3xl"><Outlet /></div>
      </main>

      {searching && <SearchPalette onClose={() => setSearching(false)} />}

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {phoneNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 text-[11.5px] ${isActive ? 'text-ink' : 'text-mute'}`}>
            <Icon size={20} strokeWidth={1.5} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function AppShell() {
  return <LibraryProvider><Shell /></LibraryProvider>
}
