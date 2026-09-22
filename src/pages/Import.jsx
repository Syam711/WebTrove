import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { INTENTS } from '../lib/intents'
import { parseBookmarksHtml, parseLinkList } from '../lib/importBookmarks'

const btn = 'rounded-md bg-clay px-5 py-2.5 text-[15px] font-medium text-on-clay transition-colors hover:bg-clay-deep disabled:opacity-50'
const quiet = 'text-[14.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink'

export default function Import() {
  const lib = useLibrary()
  const [stage, setStage] = useState('start')   // start → preview → working → done
  const [parsed, setParsed] = useState(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [intent, setIntent] = useState('other')
  const [useFolders, setUseFolders] = useState(true)
  const [progress, setProgress] = useState([0, 0])
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const have = useMemo(() => new Set(lib.searchable.map((l) => l.url)), [lib.searchable])
  const fresh = useMemo(() => parsed?.entries.filter((e) => !have.has(e.url)) ?? [], [parsed, have])
  const folders = useMemo(() => {
    const m = new Map()
    for (const e of fresh) if (e.folder) m.set(e.folder, (m.get(e.folder) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [fresh])

  const readFile = async (file) => {
    setError('')
    if (!file) return
    if (file.size > 25 * 1024 * 1024) return setError('That file is larger than expected. Bookmarks files are usually well under 5 MB.')
    const text = await file.text()
    const out = /<a\s[^>]*href/i.test(text) ? parseBookmarksHtml(text) : parseLinkList(text)
    if (!out.entries.length) return setError('No links found in that file. Choose the HTML file your browser exports from its bookmark manager.')
    setParsed(out); setStage('preview')
  }

  const readPasted = () => {
    setError('')
    const out = parseLinkList(pasted)
    if (!out.entries.length) return setError('No links found. Put one link on each line.')
    setParsed(out); setStage('preview')
  }

  const run = async () => {
    setStage('working'); setProgress([0, fresh.length])
    const res = await lib.importLinks(fresh, { intent, useFolders: useFolders && folders.length > 0, onProgress: (d, t) => setProgress([d, t]) })
    setResult(res); setStage('done')
  }

  const reset = () => { setStage('start'); setParsed(null); setPasted(''); setError('') }
  const alreadyHave = parsed ? parsed.entries.length - fresh.length : 0

  return (
    <>
      <h1 className="font-serif text-[38px] leading-tight tracking-tight md:text-[46px]">Bring your bookmarks<span className="text-clay">.</span></h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-mute">
        Import the links you already have from your browser, so your library starts full. Nothing is changed in your browser, and links you’ve saved already are skipped.
      </p>

      {stage === 'start' && (
        <div className="mt-10 space-y-8">
          <div>
            <input ref={fileRef} type="file" accept=".html,.htm,.txt,text/html,text/plain" className="sr-only"
              onChange={(e) => readFile(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]) }}
              className={`flex w-full flex-col items-center gap-3 rounded-md border border-dashed px-6 py-12 text-center transition-colors ${dragging ? 'border-ink bg-ink/[0.04]' : 'border-line bg-raised hover:border-ink'}`}>
              <FileUp size={26} strokeWidth={1.25} className="text-mute" />
              <span className="font-serif text-[22px]">Choose your bookmarks file</span>
              <span className="text-[14px] text-mute">or drop it here · an HTML file exported from your browser</span>
            </button>

            <details className="mt-4 text-[14.5px] text-mute">
              <summary className="cursor-pointer text-ink underline decoration-line underline-offset-4">How do I export my bookmarks?</summary>
              <ul className="mt-3 space-y-2 leading-relaxed">
                <li><span className="text-ink">Chrome and Edge:</span> open the bookmark manager (Ctrl Shift O), then the ⋮ menu → Export bookmarks.</li>
                <li><span className="text-ink">Firefox:</span> Ctrl Shift O for the Library, then Import and Backup → Export Bookmarks to HTML.</li>
                <li><span className="text-ink">Safari:</span> File → Export → Bookmarks.</li>
              </ul>
            </details>
          </div>

          <div className="border-t border-dashed border-line pt-8">
            <label htmlFor="paste" className="text-[14.5px] text-mute">Or paste a list of links, one on each line</label>
            <textarea id="paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} spellCheck="false"
              placeholder={'https://react.dev\nhttps://supabase.com/docs'}
              className="mt-2 w-full resize-y rounded-md border border-line bg-raised px-3.5 py-3 text-[14.5px] outline-none placeholder:text-mute/60 focus:border-ink" />
            <button onClick={readPasted} disabled={!pasted.trim()} className={`${btn} mt-3`}>Continue</button>
          </div>
          {error && <p role="alert" className="text-[14px] text-clay">{error}</p>}
        </div>
      )}

      {stage === 'preview' && parsed && (
        <div className="enter mt-10">
          <p className="font-serif text-[30px] leading-tight">
            {fresh.length} new link{fresh.length === 1 ? '' : 's'} <span className="text-mute">ready to add</span>
          </p>
          <ul className="mt-3 space-y-1 text-[14.5px] text-mute">
            {alreadyHave > 0 && <li>{alreadyHave} already in your library, skipped</li>}
            {parsed.duplicates > 0 && <li>{parsed.duplicates} repeated in the file, counted once</li>}
            {parsed.skipped > 0 && <li>{parsed.skipped} that aren’t web links, left out</li>}
          </ul>

          {fresh.length > 0 && (
            <>
              <section className="mt-9 border-t border-dashed border-line pt-7">
                <h2 className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-mute">What are these for?</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...INTENTS, ['other', 'No particular reason']].map(([key, label]) => (
                    <button key={key} onClick={() => setIntent(key)} aria-pressed={intent === key}
                      className={`rounded-sm border px-3 py-1.5 text-[13.5px] transition-colors ${intent === key ? 'border-ink bg-ink text-paper' : 'border-line text-mute hover:border-ink hover:text-ink'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {folders.length > 0 && (
                <section className="mt-8 border-t border-dashed border-line pt-7">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={useFolders} onChange={(e) => setUseFolders(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--clay)]" />
                    <span>
                      <span className="text-[15.5px]">Turn your folders into collections</span>
                      <span className="mt-1 block text-[14px] leading-relaxed text-mute">
                        {folders.length} folder{folders.length === 1 ? '' : 's'}:{' '}
                        {folders.slice(0, 6).map(([name, n]) => `${name} (${n})`).join(', ')}
                        {folders.length > 6 ? ` and ${folders.length - 6} more` : ''}
                      </span>
                    </span>
                  </label>
                </section>
              )}
            </>
          )}

          <div className="mt-10 flex items-center gap-5">
            <button onClick={run} disabled={fresh.length === 0} className={btn}>Add {fresh.length} link{fresh.length === 1 ? '' : 's'}</button>
            <button onClick={reset} className={quiet}>Choose a different file</button>
          </div>
        </div>
      )}

      {stage === 'working' && (
        <div className="mt-12" role="status">
          <p className="font-serif text-[26px]">Adding your links…</p>
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-clay transition-[width] duration-300" style={{ width: `${progress[1] ? (progress[0] / progress[1]) * 100 : 0}%` }} />
          </div>
          <p className="mt-3 text-[14px] text-mute">{progress[0]} of {progress[1]}. You can leave this page open while it works.</p>
        </div>
      )}

      {stage === 'done' && result && (
        <div className="enter mt-10">
          <p className="font-serif text-[30px] leading-tight">Added {result.added} link{result.added === 1 ? '' : 's'}.</p>
          <ul className="mt-3 space-y-1 text-[14.5px] leading-relaxed text-mute">
            {result.collectionsMade > 0 && <li>{result.collectionsMade} new collection{result.collectionsMade === 1 ? '' : 's'} made from your folders.</li>}
            {result.failed > 0 && <li>{result.failed} couldn’t be saved. Try importing the file again to pick them up.</li>}
            <li>Titles came from your bookmarks. Pictures and descriptions fill in as each page is read, a couple at a time, while Recall is open.</li>
          </ul>
          <div className="mt-8 flex items-center gap-5">
            <Link to="/app" className={btn}>Go to your library</Link>
            <button onClick={reset} className={quiet}>Import more</button>
          </div>
        </div>
      )}
    </>
  )
}
