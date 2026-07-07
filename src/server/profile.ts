import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server-client'
import type { Database } from '#/lib/supabase/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export const getMyProfile = createServerFn({ method: 'GET' }).handler(async (): Promise<Profile | null> => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data ?? null
})

const updateProfileInput = z.object({
  displayName: z.string().trim().min(1).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currency: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).optional(),
  platforms: z.array(z.enum(['tiktok', 'instagram', 'youtube'])).optional(),
  audienceTier: z.enum(['nano', 'micro', 'mid', 'macro']).optional(),
  niche: z.string().trim().min(1).optional(),
  /** Only ever set (never unset) — the onboarding wizard's final step is the sole caller that passes true. */
  completeOnboarding: z.boolean().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileInput>

/** Shared upsert used by both the onboarding wizard and the Settings page — one profile write path, not two. */
export const updateMyProfile = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateProfileInput.parse(input))
  .handler(async ({ data }): Promise<Profile> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const updates: Database['public']['Tables']['profiles']['Update'] = {}
    if (data.displayName !== undefined) updates.display_name = data.displayName
    if (data.theme !== undefined) updates.theme = data.theme
    if (data.currency !== undefined) updates.currency = data.currency
    if (data.country !== undefined) updates.country = data.country
    if (data.platforms !== undefined) updates.platforms = data.platforms
    if (data.audienceTier !== undefined) updates.audience_tier = data.audienceTier
    if (data.niche !== undefined) updates.niche = data.niche
    if (data.completeOnboarding) updates.onboarding_completed_at = new Date().toISOString()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error || !profile) throw new Error(error?.message ?? 'Failed to update profile')
    return profile
  })
