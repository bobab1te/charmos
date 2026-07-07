import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'charmos.dashboard.hidden-widgets'

function readHidden(): Array<string> {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Array<string>) : []
  } catch {
    return []
  }
}

export function useWidgetVisibility() {
  const [hidden, setHidden] = useState<Array<string>>([])
  const isFirstRender = useRef(true)

  // A single effect gates the initial localStorage read and every later write.
  // Splitting these into two separate effects races: the write effect would
  // fire on the same mount commit as the read (before the read's setHidden
  // takes effect) and clobber storage back to the pre-read value.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setHidden(readHidden())
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden))
  }, [hidden])

  const hide = useCallback((id: string) => {
    setHidden((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const show = useCallback((id: string) => {
    setHidden((prev) => prev.filter((w) => w !== id))
  }, [])

  const isHidden = useCallback((id: string) => hidden.includes(id), [hidden])

  return { hidden, hide, show, isHidden }
}
