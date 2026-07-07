import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'charmos.sidebar.collapsed'

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)
  const isFirstRender = useRef(true)

  // Single effect gates the initial localStorage read and every later write —
  // see use-widget-visibility.ts for why splitting these into two effects races.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setCollapsed(readCollapsed())
      return
    }
    window.localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return { collapsed, toggle: () => setCollapsed((c) => !c) }
}
