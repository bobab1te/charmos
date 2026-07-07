import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseServerClient } from '#/lib/supabase/server-client'

/** Response.redirect() returns a Response with immutable headers, which crashes when the framework
 * later tries to merge in Set-Cookie headers from exchangeCodeForSession. Build the redirect by hand
 * so its headers stay mutable. */
function redirectTo(url: string) {
  return new Response(null, { status: 307, headers: { Location: url } })
}

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const origin = url.origin

        if (!code) {
          return redirectTo(`${origin}/login?error=missing_code`)
        }

        try {
          const supabase = getSupabaseServerClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            return redirectTo(`${origin}/login?error=${encodeURIComponent(error.message)}`)
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
              return redirectTo(`${origin}/onboarding`)
            }
          }

          return redirectTo(`${origin}/dashboard`)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'auth_failed'
          return redirectTo(`${origin}/login?error=${encodeURIComponent(message)}`)
        }
      },
    },
  },
})
