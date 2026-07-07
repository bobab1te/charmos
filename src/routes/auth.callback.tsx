import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseServerClient } from '#/lib/supabase/server-client'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const origin = url.origin

        if (!code) {
          return Response.redirect(`${origin}/login?error=missing_code`, 307)
        }

        try {
          const supabase = getSupabaseServerClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            return Response.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`, 307)
          }

          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed_at')
              .eq('id', user.id)
              .single()
            if (!profile?.onboarding_completed_at) {
              return Response.redirect(`${origin}/onboarding`, 307)
            }
          }

          return Response.redirect(`${origin}/dashboard`, 307)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'auth_failed'
          return Response.redirect(`${origin}/login?error=${encodeURIComponent(message)}`, 307)
        }
      },
    },
  },
})
