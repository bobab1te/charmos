import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient, isSupabaseConfigured } from '#/lib/supabase/server-client'
import type { Profile } from './profile'

export interface AuthUser {
  id: string
  email: string | null
  /** Best-effort prefill for the onboarding wizard's display name step — Google OAuth populates this, email/password sign-up won't. */
  suggestedDisplayName: string | null
}

export type AuthState =
  | { configured: false }
  | { configured: true; user: null; profile: null }
  | { configured: true; user: AuthUser; profile: Profile | null }

/** Used by every route guard (_app, login, onboarding) — the single source of truth for "who is this and are they onboarded". */
export const getCurrentUserAndProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthState> => {
    if (!isSupabaseConfigured) return { configured: false }

    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { configured: true, user: null, profile: null }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    const metadata = user.user_metadata as Record<string, unknown> | undefined
    const suggestedDisplayName =
      (typeof metadata?.full_name === 'string' && metadata.full_name) ||
      (typeof metadata?.name === 'string' && metadata.name) ||
      null

    return {
      configured: true,
      user: { id: user.id, email: user.email ?? null, suggestedDisplayName },
      profile: profile ?? null,
    }
  },
)
