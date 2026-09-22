import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Wordmark from './Wordmark'
import ThemeToggle from './ThemeToggle'

export default function SiteHeader() {
  const { user, demo } = useAuth()
  const signedIn = Boolean(user || demo)
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
      <Link to="/" aria-label="Recall home"><Wordmark className="text-[26px]" /></Link>
      <nav className="flex items-center gap-1 text-[15px]">
        <a href="#how" className="hidden rounded-md px-3 py-2 text-mute transition-colors hover:text-ink sm:block">
          How it works
        </a>
        <ThemeToggle />
        {signedIn ? (
          <Link to="/app" className="ml-1 rounded-md bg-clay px-4 py-2 font-medium text-on-clay transition-colors hover:bg-clay-deep">
            Open Recall
          </Link>
        ) : (
          <Link to="/login" className="ml-1 rounded-md border border-line px-4 py-2 transition-colors hover:border-ink">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
