import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { LoginDecor } from '#/components/charm/login-decor'
import { getSupabaseBrowserClient } from '#/lib/supabase/browser-client'
import { getCurrentUserAndProfile } from '#/server/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const result = await getCurrentUserAndProfile()
    if (!result.configured) throw redirect({ to: '/setup-required' })
    if (result.user) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.5 5.1 29.5 3 24 3 16 3 9 7.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.2-1.9 13.9-5.1l-6.4-5.3C29.5 36.7 26.9 37.5 24 37.5c-5.3 0-9.7-3.3-11.3-8h-6.6v5.6C9.1 40.7 16 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.3C41.8 35.3 45 30 45 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpNotice, setSignUpNotice] = useState<string | null>(null)

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSignUpNotice(null)
    try {
      const supabase = getSupabaseBrowserClient()
      if (mode === 'sign-in') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) {
          setError(authError.message)
          return
        }
        navigate({ to: '/dashboard' })
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) {
          setError(authError.message)
          return
        }
        if (data.session) {
          navigate({ to: '/dashboard' })
        } else {
          setSignUpNotice('Check your email to confirm your account, then sign in.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) setError(authError.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <LoginDecor />
      <div className="charm-glass relative z-10 w-full max-w-md rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Sparkles className="size-5" />
          </span>
          <h1 className="font-display-bold text-2xl font-semibold text-[var(--charm-ink)]">Welcome to CharmOS</h1>
          <p className="text-sm text-[var(--charm-ink-soft)]">Your brand deals, ideas, and earnings — all synced.</p>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as 'sign-in' | 'sign-up')
            setError(null)
            setSignUpNotice(null)
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="sign-in" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="sign-up" className="flex-1">
              Sign up
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleEmailSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">{error}</p>
          )}
          {signUpNotice && (
            <p className="rounded-lg bg-[var(--urgency-green)]/10 px-3 py-2 text-sm text-[var(--urgency-green)]">
              {signUpNotice}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--charm-ink-soft)]">
          <span className="h-px flex-1 bg-[var(--charm-ink-soft)]/20" /> or{' '}
          <span className="h-px flex-1 bg-[var(--charm-ink-soft)]/20" />
        </div>

        <Button type="button" variant="outline" onClick={handleGoogle} className="w-full gap-2">
          <GoogleIcon /> Continue with Google
        </Button>
      </div>
    </div>
  )
}
