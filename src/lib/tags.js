/** "#React Hooks" → "react-hooks". Returns '' if nothing usable remains. */
export function normalizeTag(raw) {
  return raw
    .trim().replace(/^#+/, '').toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40)
}
