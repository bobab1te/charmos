import { createServerClient } from '@supabase/ssr'
import { deleteCookie, getCookies, setCookie } from '@tanstack/react-start/server'
import type { CookieSerializeOptions } from 'cookie-es'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Creates a fresh Supabase client bound to the current request's cookie jar.
 * Must be called fresh inside every server function/route handler — never
 * memoized or shared across requests (Supabase's own SSR guidance).
 */
export function getSupabaseServerClient() {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file — see docs/supabase-setup.md.',
    )
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          const serializeOptions = options as CookieSerializeOptions
          if (value === '') {
            deleteCookie(name, serializeOptions)
          } else {
            setCookie(name, value, serializeOptions)
          }
        }
      },
    },
  })
}
