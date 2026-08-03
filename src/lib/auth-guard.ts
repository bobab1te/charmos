import { getCurrentUserAndProfile } from '#/server/auth'
import type { AuthState } from '#/server/auth'

/**
 * Deduplicating wrapper around the auth guard, to stop navigation bursts from stampeding the
 * token refresh.
 *
 * The problem it solves. Supabase rotates refresh tokens: each refresh consumes the old one and
 * issues a new one, and presenting a consumed token outside the project's reuse interval revokes
 * the entire session rather than failing that one call. Both halves of this app can trigger a
 * refresh — the browser client's own autoRefreshToken timer, and any server function whose
 * getUser() finds an expired access token. Server functions are separate HTTP requests, so two
 * that overlap each build their own client from the same cookie snapshot and each try to refresh
 * with the same token.
 *
 * `beforeLoad` runs on every match resolution, including search-param-only changes, so switching
 * a tab on Brand Deals is a full auth round trip. A handful of quick navigations while the access
 * token happens to be expiring is enough to overlap two refreshes.
 *
 * What this does. Concurrent callers share one in-flight request, and the result is reused for a
 * few seconds afterwards, so a burst of navigations costs one refresh instead of one per
 * navigation.
 *
 * What this is not. It is not the security boundary — that is RLS on every table, plus the server
 * validating the token on each real data call. This guard only decides which screen to show, so
 * serving it from a seconds-old answer is safe. Sign-out navigates immediately and does not wait
 * for the window to lapse.
 */

const TTL_MS = 5_000

let cached: { at: number; value: AuthState } | null = null
let inFlight: Promise<AuthState> | null = null

/**
 * Module state is per-process, so on the server this would be shared between users — one
 * request's identity could be handed to the next. Caching is therefore client-only; the server
 * always asks fresh, which is also where correctness matters most.
 */
const isClient = typeof window !== 'undefined'

export async function getAuthState(): Promise<AuthState> {
  if (!isClient) return getCurrentUserAndProfile()

  if (cached && Date.now() - cached.at < TTL_MS) return cached.value
  if (inFlight) return inFlight

  inFlight = getCurrentUserAndProfile()
    .then((value) => {
      cached = { at: Date.now(), value }
      return value
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/**
 * Drop the cached answer. Call after anything that changes who the user is — signing out, or
 * completing onboarding — so the next guard check reflects it immediately instead of waiting out
 * the window.
 */
export function invalidateAuthState() {
  cached = null
}
