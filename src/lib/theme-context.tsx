import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NIGHT_THRESHOLD, useSkyPhase } from '#/lib/sky-phase'

const STORAGE_KEY = 'charmos.theme'

export type Theme = 'light' | 'dark'
/** 'auto' resolves from local time via sky-phase.ts — the same scalar the hero environment uses. */
export type ThemePreference = Theme | 'auto'

/**
 * 'auto' is the default when nothing has been stored, so a fresh install follows the clock rather
 * than sitting in light mode at midnight. Anyone who has ever touched the toggle has a concrete
 * value here already, so this does not silently change their setting.
 */
function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored
    return 'auto'
  } catch {
    return 'auto'
  }
}

interface ThemeContextValue {
  /** Always resolved to something the CSS can use — consumers never see 'auto'. */
  theme: Theme
  preference: ThemePreference
  /** Sets a manual override. Kept as `setTheme` so existing call sites are unaffected. */
  setTheme: (theme: ThemePreference) => void
  /**
   * Applies the theme saved on the user's profile. Deliberately a no-op while the local preference
   * is 'auto': automatic mode is a per-device choice (like an OS appearance setting), so a value
   * synced from another device must not silently cancel it.
   */
  applyProfileTheme: (theme: Theme) => void
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
  const [preference, setPreferenceState] = useState<ThemePreference>('auto')
  const isFirstRender = useRef(true)
  const phase = useSkyPhase()

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setPreferenceState(readStoredPreference())
      return
    }
    window.localStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  const theme: Theme = preference === 'auto' ? (phase >= NIGHT_THRESHOLD ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const setTheme = useCallback((next: ThemePreference) => setPreferenceState(next), [])

  // Reads storage rather than the `preference` state on purpose: this is called from a descendant's
  // mount effect, which runs before this provider's own effect has loaded the stored value.
  const applyProfileTheme = useCallback((next: Theme) => {
    if (readStoredPreference() === 'auto') return
    setPreferenceState(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, applyProfileTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
