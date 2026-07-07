import { useCallback, useEffect, useState } from 'react'

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

  useEffect(() => {
    setHidden(readHidden())
  }, [])

  useEffect(() => {
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
