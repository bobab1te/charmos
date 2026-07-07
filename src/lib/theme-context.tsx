import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'charmos.theme'

export type Theme = 'light' | 'dark'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Single shared source of truth for the .dark class on <html>. Pre-login/pre-
 * onboarding routes only ever read/write the localStorage fallback here.
 * Once authenticated, _app.tsx calls setTheme(profile.theme) once profile
 * data is available, which flows through this same instance — never two
 * independent toggles fighting over the DOM class.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setThemeState(readStoredTheme())
      return
    }
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
