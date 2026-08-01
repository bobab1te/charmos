import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server-client'

/**
 * Feature suggestions submitted from Settings.
 *
 * The user_id is taken from the authenticated session here, never from the client payload — a
 * submission cannot be attributed to someone else even if the request is crafted by hand. RLS
 * enforces the same rule at the database level (see the feature_requests migration), so this is
 * the belt, not the only trousers.
 */

export const FEATURE_CATEGORIES = [
  'Brand deals',
  'Partnerships',
  'Scrapbook & ideas',
  'Finances',
  'Dashboard',
  'Something else',
] as const

const submitInput = z.object({
  suggestion: z.string().trim().min(3, 'Tell me a little more than that.').max(500),
  reason: z.string().trim().max(1000).optional(),
  category: z.enum(FEATURE_CATEGORIES).optional(),
  details: z.string().trim().max(2000).optional(),
})

export type SubmitFeatureRequestInput = z.infer<typeof submitInput>

export const submitFeatureRequest = createServerFn({ method: 'POST' })
  .validator((input: unknown) => submitInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const { error } = await supabase.from('feature_requests').insert({
      user_id: user.id,
      suggestion: data.suggestion,
      reason: data.reason || null,
      category: data.category || null,
      details: data.details || null,
    })

    if (error) {
      // 23505 = unique_violation, which here can only be the rapid-duplicate index: the same user
      // sending the same suggestion twice within a minute. That is a double-submit, not a failure
      // worth showing the user — their idea is already saved.
      if (error.code === '23505') return { ok: true }
      throw new Error('Could not save that suggestion. Please try again.')
    }

    return { ok: true }
  })
