import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SiteHeader from '../components/SiteHeader'
import Clipping from '../components/Clipping'
import Wordmark from '../components/Wordmark'
import ThemeToggle from '../components/ThemeToggle'

const STEPS = [
  ['Save it in a second', 'Paste a link, or press Ctrl K. The title, site and picture fill themselves in.'],
  ['Say why', 'One tap: learn later, for a project, read later, reference, inspiration. Add a line of your own if you like.'],
  ['Sort it, or don’t', 'Group links into collections when it helps. Skip it when it doesn’t. Nothing is lost either way.'],
  ['Find it, or be reminded', 'Search that forgives typos and half-remembered words, and a quiet nudge for things you meant to come back to.'],
]

const CALM = [
  ['No folders to keep tidy', 'Links can live in several collections at once, so you never have to choose one shelf.'],
  ['No feed, no streaks', 'Recall doesn’t compete for your attention. It waits until you need it.'],
  ['Yours alone', 'Every link is private to your account, and stays that way.'],
]

export default function Landing() {
  const { user, demo } = useAuth()
  const signedIn = Boolean(user || demo)
  const cta = signedIn ? { to: '/app', label: 'Open your library' } : { to: '/login?mode=signup', label: 'Start keeping links' }

  return (
    <>
      <SiteHeader />

      <main>
        {/* hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-[1.1fr_1fr] lg:px-10 lg:pt-20">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-clay">A place for the links you save</p>
            <h1 className="mt-5 font-serif text-[48px] leading-[1.04] tracking-tight sm:text-[64px]">
              Keep what you find.<br />
              <span className="italic text-mute">Find it again.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-mute">
              Most bookmarks are never opened a second time. WebTrove remembers why you saved each
              one, and brings it back when it matters.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to={cta.to}
                className="inline-flex items-center gap-2 rounded-md bg-clay px-5 py-3 text-[16px] font-medium text-on-clay transition-colors hover:bg-clay-deep">
                {cta.label} <ArrowRight size={17} strokeWidth={1.75} />
              </Link>
              <a href="#how" className="text-[15px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                See how it works
              </a>
            </div>
          </div>

          <div className="relative mx-auto h-[24rem] w-full max-w-md sm:h-[27rem]" aria-hidden="true">
            <Clipping className="absolute left-0 top-0 w-[88%] -rotate-[1.4deg]"
              site="react.dev" title="Synchronizing with Effects"
              body="How to keep a component in step with something outside React, and when to clean up after it."
              saved="Saved for a project · the cleanup bug" />
            <Clipping className="absolute right-0 top-40 w-[88%] rotate-[1.2deg] sm:top-44"
              site="supabase.com" title="Row level security, explained"
              body="Policies that decide which rows each signed-in user is allowed to touch."
              saved="Saved to learn later · 3 days ago" />
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="border-y border-dashed border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
            <h2 className="font-serif text-[34px] tracking-tight sm:text-[40px]">How it works</h2>
            <ol className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-5">
                  <span className="font-serif text-[34px] italic leading-none text-clay/90">{i + 1}</span>
                  <div>
                    <h3 className="text-[18px] font-medium">{title}</h3>
                    <p className="mt-1.5 max-w-sm text-[15.5px] leading-relaxed text-mute">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* calm */}
        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
          <h2 className="max-w-xl font-serif text-[34px] leading-tight tracking-tight sm:text-[40px]">
            Made to stay out of your way.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {CALM.map(([title, body]) => (
              <div key={title} className="border-t border-line pt-5">
                <h3 className="text-[17px] font-medium">{title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-mute">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* closing */}
        <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-10">
          <div className="rounded-md border border-line bg-raised px-8 py-14 text-center sm:px-16">
            <h2 className="font-serif text-[34px] tracking-tight sm:text-[42px]">
              The good things you find are worth keeping.
            </h2>
            <Link to={cta.to}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-clay px-5 py-3 text-[16px] font-medium text-on-clay transition-colors hover:bg-clay-deep">
              {cta.label} <ArrowRight size={17} strokeWidth={1.75} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-line px-6 py-8 text-[14px] text-mute lg:px-10">
        <Wordmark className="text-[20px] text-ink" />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Made for people with too many tabs open.</span>
          <ThemeToggle />
        </div>
      </footer>
    </>
  )
}
