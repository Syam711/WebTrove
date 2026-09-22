export function timeAgo(iso) {
  const then = new Date(iso)
  const mins = Math.round((Date.now() - then.getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const days = Math.floor((startOfDay(new Date()) - startOfDay(then)) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) { const w = Math.round(days / 7); return `${w} week${w > 1 ? 's' : ''} ago` }
  return then.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
