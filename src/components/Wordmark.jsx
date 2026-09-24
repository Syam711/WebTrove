export default function Wordmark({ className = '' }) {
  return (
    <span className={`font-serif tracking-tight ${className}`}>
      WebTrove<span className="text-clay">.</span>
    </span>
  )
}
