import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/** Throws a clear, catchable error if VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY aren't set yet. */
export function getSupabaseBrowserClient() {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file — see docs/supabase-setup.md.',
    )
  }
  if (!client) {
    client = createBrowserClient<Database>(url, anonKey)
  }
  return client
}
