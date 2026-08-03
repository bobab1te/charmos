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
          const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            return redirectTo(`${origin}/login?error=${encodeURIComponent(error.message)}`)
          }

          /*
           * Drop Google's provider tokens before the session is persisted.
           *
           * An OAuth exchange returns provider_token and provider_refresh_token alongside our own
           * pair. They are Google's credentials for calling Google's APIs — CharmOS never calls
           * one, so this stores third-party credentials we have no use for. That alone justifies
           * removing them.
           *
           * What it does NOT do is stop the session cookie chunking, which is why it was originally
           * written. Measured on a real session: ~3550 bytes of JSON, of which the access token is
           * 1363 and the serialized user object about 1730 — both structural. The provider tokens
           * are roughly 400, against the ~1175 that would have to go to fit under @supabase/ssr's
           * ~3.2KB single-cookie limit. The session chunks with or without them.
           *
           * setSession with just the two tokens rebuilds the stored session without the provider
           * fields — one extra call, once per sign-in, only on the OAuth path.
           */
          if (exchanged.session) {
            await supabase.auth.setSession({
              access_token: exchanged.session.access_token,
              refresh_token: exchanged.session.refresh_token,
            })
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
