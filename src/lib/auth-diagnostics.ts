import { getSupabaseBrowserClient, isSupabaseConfigured } from '#/lib/supabase/browser-client'

/**
 * Development-only instrumentation for sessions disappearing mid-use.
 *
 * Why this exists rather than another guess. Sessions have dropped with the cookie jar
 * *completely empty* rather than holding an expired token, which is revocation or deletion, not
 * expiry. Refresh-token rotation was the first theory, but the project's reuse interval is 10s,
 * which tolerates the overlap that theory depends on — so the cause is still open, and the next
 * occurrence is worth capturing properly instead of reasoning about in the abstract.
 *
 * The leading remaining candidate is chunked-cookie desync. @supabase/ssr splits a session over
 * roughly 3.2KB across `…auth-token.0`, `.1`, … and, if any chunk is missing when it reads them
 * back, deletes the whole set and reports a signed-out user. A Google OAuth session carries
 * provider tokens and is easily large enough to chunk, which makes this app a candidate.
 *
 * So this records what the cookie jar looked like immediately before and after each auth event.
 * A SIGNED_OUT that nobody asked for, printed next to "there were 2 chunks a moment ago and 1
 * now", would settle it.
 *
 * Never records cookie *values* — only names and byte lengths. The values are bearer tokens.
 *
 * Findings are written to localStorage as well as the console, because the console is wiped
 * whenever the tab is replaced — which is exactly what happens when a dropped session bounces you
 * to the login page. Four drops so far have left no trace for that reason. localStorage survives,
 * so the record is still there afterwards.
 */

const LOG_KEY = 'charmos.authlog'
const MAX_ENTRIES = 40

type LogEntry = { at: string; event: string; hasSession: boolean; before: unknown; after: unknown; lost: boolean }

function append(entry: LogEntry) {
  try {
    const existing = JSON.parse(window.localStorage.getItem(LOG_KEY) ?? '[]') as Array<LogEntry>
    // Newest first and capped, so this can never grow without bound on a long-lived profile.
    window.localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)))
  } catch {
    // Storage full or blocked — diagnostics must never break the app they are watching.
  }
}

/** Read the recorded auth history. Call from the console: `__charmAuthLog()`. */
export function readAuthLog(): Array<LogEntry> {
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) ?? '[]') as Array<LogEntry>
  } catch {
    return []
  }
}

type CookieShape = { name: string; bytes: number }

function authCookies(): Array<CookieShape> {
  if (typeof document === 'undefined') return []
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.startsWith('sb-'))
    .map((c) => {
      const eq = c.indexOf('=')
      return { name: c.slice(0, eq), bytes: c.length - eq - 1 }
    })
}

function describe(cookies: Array<CookieShape>) {
  const chunked = cookies.filter((c) => /\.\d+$/.test(c.name))
  return {
    count: cookies.length,
    names: cookies.map((c) => c.name),
    totalBytes: cookies.reduce((sum, c) => sum + c.bytes, 0),
    chunks: chunked.length,
  }
}

let started = false

export function startAuthDiagnostics() {
  if (started || !import.meta.env.DEV || !isSupabaseConfigured) return
  if (typeof window === 'undefined') return
  started = true

  let previous = describe(authCookies())

  // Exposed so the history can be read back from the console after a drop, without needing the
  // devtools to have been open when it happened.
  ;(window as unknown as { __charmAuthLog?: () => Array<LogEntry> }).__charmAuthLog = readAuthLog

  getSupabaseBrowserClient().auth.onAuthStateChange((event, session) => {
    const current = describe(authCookies())
    const lost = previous.count > 0 && current.count === 0

    // A signed-out with no session and no cookies, that the user did not ask for, is the event
    // worth shouting about — everything else is routine and stays at debug level.
    const level = event === 'SIGNED_OUT' && lost ? 'warn' : 'debug'
    // eslint-disable-next-line no-console -- dev-only diagnostic, gated on import.meta.env.DEV
    console[level]('[charmos:auth]', event, {
      hasSession: Boolean(session),
      expiresAt: session?.expires_at ?? null,
      cookiesBefore: previous,
      cookiesAfter: current,
      ...(lost ? { note: 'cookie jar emptied — run __charmAuthLog() for the full history' } : {}),
    })

    append({
      at: new Date().toISOString(),
      event,
      hasSession: Boolean(session),
      before: previous,
      after: current,
      lost,
    })

    previous = current
  })
}
