import { useState } from 'react'

// Site icon, with a quiet lettered square when there isn't one (or it fails to load).
export default function Favicon({ src, domain, size = 16 }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return (
      <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
        onError={() => setBroken(true)} className="shrink-0 rounded-[3px]" style={{ width: size, height: size }} />
    )
  }
  return (
    <span aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] bg-clay/80 font-serif text-[10px] uppercase leading-none text-on-clay"
      style={{ width: size, height: size }}>
      {domain?.[0] ?? '·'}
    </span>
  )
}
