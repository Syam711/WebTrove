// Pure helpers for keeping the page fetcher away from private networks (SSRF).

export function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const l = ip.toLowerCase()
    if (l === '::1' || l === '::') return true
    if (/^f[cd]/.test(l)) return true                 // unique local fc00::/7
    if (/^fe[89ab]/.test(l)) return true              // link-local fe80::/10
    if (l.startsWith('::ffff:')) {                    // IPv4-mapped
      const rest = l.slice(7)
      if (rest.includes('.')) return isPrivateIp(rest)
      const g = rest.split(':').map((x) => parseInt(x, 16))
      if (g.length === 2 && g.every((n) => Number.isInteger(n))) {
        return isPrivateIp(`${g[0] >> 8}.${g[0] & 255}.${g[1] >> 8}.${g[1] & 255}`)
      }
      return true
    }
    return false
  }
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||             // carrier-grade NAT
    (a === 169 && b === 254) ||                       // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224                                          // multicast + reserved
  )
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/** Returns a reason string if the URL must not be fetched, otherwise null. */
export function urlProblem(u: URL): string | null {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Only http and https links can be read.'
  if (u.username || u.password) return 'Links with credentials are not allowed.'
  if (u.port && u.port !== '80' && u.port !== '443') return 'Unusual ports are not allowed.'
  const h = u.hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return 'Local addresses are not allowed.'
  }
  if (IPV4.test(h) && isPrivateIp(h)) return 'Private addresses are not allowed.'
  if (h.startsWith('[') && isPrivateIp(h.slice(1, -1))) return 'Private addresses are not allowed.'
  return null
}
