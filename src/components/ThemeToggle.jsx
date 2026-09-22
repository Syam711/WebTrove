import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const current = () => {
  const set = document.documentElement.getAttribute('data-theme')
  if (set) return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('light')
  useEffect(() => setTheme(current()), [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('recall-theme', next) } catch { /* storage can be unavailable */ }
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={`rounded-md p-2 text-mute transition-colors hover:bg-ink/[0.06] hover:text-ink ${className}`}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  )
}
