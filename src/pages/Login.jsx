import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isConfigured } from '../lib/supabase'
import Wordmark from '../components/Wordmark'
import Clipping from '../components/Clipping'
import ThemeToggle from '../components/ThemeToggle'

const field =
  'w-full rounded-md border border-line bg-raised px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-mute/70 focus:border-ink'

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  )
}

export default function Login() {
  const { user, signIn, signUp, signInWithGoogle, startDemo } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (user) navigate('/app', { replace: true })
  }, [user, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const { data, error: err } =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (err) return setError(err.message)
    if (mode === 'signup' && !data?.session) setNotice('Check your inbox to confirm your email, then sign in.')
  }

  const google = async () => {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err.message)
  }

  return (
    <main className="mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-16 px-6 py-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:px-10">
      <section className="w-full max-w-sm justify-self-center lg:justify-self-start">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Recall home"><Wordmark className="text-[34px]" /></Link>
          <ThemeToggle />
        </div>
        <p className="mt-3 font-serif text-[21px] italic leading-snug text-mute">
          Keep what you find. Find it again.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-3">
          <button
            type="button"
            onClick={google}
            className="flex w-full items-center justify-center gap-2.5 rounded-md border border-line bg-raised px-4 py-2.5 text-[15px] font-medium transition-colors hover:border-ink"
          >
            <GoogleMark /> Continue with Google
          </button>

          <div className="flex items-center gap-3 py-1 text-[12.5px] text-mute">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <input className={field} type="email" required autoComplete="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={field} type="password" required minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <p role="alert" className="text-[13.5px] text-clay">{error}</p>}
          {notice && <p className="text-[13.5px] text-mute">{notice}</p>}

          <button type="submit" disabled={busy}
            className="w-full rounded-md bg-clay px-4 py-2.5 text-[15px] font-medium text-on-clay transition-colors hover:bg-clay-deep disabled:opacity-60">
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-[14px] text-mute">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>

        {!isConfigured && (
          <p className="mt-8 border-t border-dashed border-line pt-4 text-[13px] leading-relaxed text-mute">
            Supabase isn't connected in this build, so sign-in is off.{' '}
            <button type="button" onClick={() => { startDemo(); navigate('/app') }}
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              Look around without signing in
            </button>
          </p>
        )}
      </section>

      <section className="hidden lg:block" aria-hidden="true">
        <div className="relative mx-auto h-[26rem] max-w-md">
          <Clipping className="absolute left-0 top-0 w-[22rem] -rotate-[1.4deg]"
            site="react.dev" title="Synchronizing with Effects"
            body="How to keep a component in step with something outside React, and when to clean up after it."
            saved="Saved for a project · the cleanup bug" />
          <Clipping className="absolute left-16 top-44 w-[22rem] rotate-[1.1deg]"
            site="supabase.com" title="Row level security, explained"
            body="Policies that decide which rows each signed-in user is allowed to touch."
            saved="Saved to learn later · 3 days ago" />
        </div>
      </section>
    </main>
  )
}
