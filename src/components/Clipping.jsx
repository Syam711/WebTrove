export default function Clipping({ site, title, body, saved, className = '' }) {
  return (
    <article className={`rounded-md border border-line bg-raised p-5 ${className}`}>
      <p className="flex items-center gap-2 text-[12.5px] text-mute">
        <span className="inline-block h-3 w-3 rounded-[3px] bg-clay/80" />
        {site}
      </p>
      <h3 className="mt-2.5 font-serif text-[22px] leading-snug">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-mute">{body}</p>
      <p className="mt-4 border-t border-dashed border-line pt-3 text-[12.5px] text-mute">{saved}</p>
    </article>
  )
}
