import { useState } from 'react'

/** Cards or list, remembered between visits. */
export function useView() {
  const [view, setViewState] = useState(() => {
    try { return localStorage.getItem('recall-view') === 'list' ? 'list' : 'cards' } catch { return 'cards' }
  })
  const setView = (v) => {
    setViewState(v)
    try { localStorage.setItem('recall-view', v) } catch { /* storage unavailable */ }
  }
  return [view, setView]
}
