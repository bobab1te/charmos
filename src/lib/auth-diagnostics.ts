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

/**
 * Where the session's bytes actually go. Call from the console: `__charmAuthSize()`.
 *
 * Knowing the cookie is 4.7KB says it chunks; it doesn't say why. This decodes the access token's
 * payload and reports the byte cost of each top-level claim, so the bloat can be attributed to a
 * specific claim rather than guessed at. `provider` answers the other open question — whether a
 * given session came from Google at all, which decides if stripping provider tokens was ever
 * relevant to it.
 *
 * Reports sizes and claim *names*, plus the values of the two small enum-ish fields that identify
 * the sign-in method. Never returns the token, and never the contents of user metadata.
 */
export function readAuthSize() {
  const cookies = authCookies()
  const jar = describe(cookies)

  let session: { access_token?: string; refresh_token?: string } | null = null
  try {
    // The chunks concatenate in name order into one JSON blob; @supabase/ssr also prefixes newer
    // sessions with `base64-`, which has to come off before it parses.
    const raw = cookies
      .filter((c) => c.name.includes('auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const match = document.cookie.match(new RegExp(`(?:^|; )${c.name}=([^;]*)`))
        return match ? decodeURIComponent(match[1]) : ''
      })
      .join('')
    const body = raw.startsWith('base64-') ? atob(raw.slice(7)) : raw
    session = JSON.parse(body) as { access_token?: string; refresh_token?: string }
  } catch {
    return { jar, note: 'could not parse the session cookie — it may be a format this reader does not know' }
  }

  const token = session?.access_token
  if (!token) return { jar, note: 'no access token found in the cookie' }

  let claims: Record<string, unknown> = {}
  try {
    claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch {
    return { jar, note: 'could not decode the access token payload' }
  }

  // Sorted biggest-first: the point of this is to name the one claim worth attacking.
  const byClaim = Object.entries(claims)
    .map(([key, value]) => ({ claim: key, bytes: JSON.stringify(value).length }))
    .sort((a, b) => b.bytes - a.bytes)

  const appMetadata = (claims.app_metadata ?? {}) as { provider?: string; providers?: Array<string> }

  return {
    jar,
    accessTokenBytes: token.length,
    refreshTokenBytes: session.refresh_token?.length ?? 0,
    /** Which sign-in produced this session — decides whether the provider-token strip applies. */
    provider: appMetadata.provider ?? null,
    providers: appMetadata.providers ?? null,
    /** True means the provider tokens are still being persisted despite the callback stripping them. */
    stillHasProviderTokens: 'provider_token' in (session as object) || 'provider_refresh_token' in (session as object),
    byClaim,
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

/**
 * ~3.2KB is where @supabase/ssr starts splitting the session across numbered cookies, and being
 * split is the precondition for losing it. Reporting the headroom makes it obvious whether a
 * change actually helped rather than merely sounding like it should have.
 */
const CHUNK_THRESHOLD_BYTES = 3180

function describe(cookies: Array<CookieShape>) {
  const chunked = cookies.filter((c) => /\.\d+$/.test(c.name))
  const totalBytes = cookies.reduce((sum, c) => sum + c.bytes, 0)
  return {
    count: cookies.length,
    names: cookies.map((c) => c.name),
    totalBytes,
    chunks: chunked.length,
    /** Negative means it fits in one cookie and cannot hit the chunk-desync failure at all. */
    bytesOverChunkThreshold: totalBytes - CHUNK_THRESHOLD_BYTES,
  }
}

export function startAuthDiagnostics() {
  if (!import.meta.env.DEV || !isSupabaseConfigured) return
  if (typeof window === 'undefined') return

  let previous = describe(authCookies())

  // Exposed so the history can be read back from the console after a drop, without needing the
  // devtools to have been open when it happened.
  const bridge = window as unknown as {
    __charmAuthLog?: () => Array<LogEntry>
    __charmAuthSize?: () => unknown
  }
  bridge.__charmAuthLog = readAuthLog
  bridge.__charmAuthSize = readAuthSize

  const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event, session) => {
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

  /*
   * Returned so the caller's effect can unsubscribe. Without it, every hot reload re-evaluated this
   * module, registered a second listener, and left the first one alive — which is why the log
   * recorded each SIGNED_IN twice with an identical timestamp. A module-level `started` guard could
   * not prevent that, since the reload reset the guard along with everything else.
   */
  return () => data.subscription.unsubscribe()
}
