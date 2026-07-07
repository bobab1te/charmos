import { createFileRoute } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'

export const Route = createFileRoute('/setup-required')({ component: SetupRequiredPage })

function SetupRequiredPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="charm-glass max-w-md rounded-3xl p-8 text-center">
        <Settings2 className="mx-auto mb-3 size-8 text-[var(--charm-ink-soft)]" />
        <h1 className="font-display-bold text-xl font-semibold text-[var(--charm-ink)]">Supabase isn't configured yet</h1>
        <p className="mt-2 text-sm text-[var(--charm-ink-soft)]">
          CharmOS needs a Supabase project for accounts and cross-device sync. Follow{' '}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">docs/supabase-setup.md</code> in the project,
          then add <code className="rounded bg-white/60 px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> to your{' '}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">.env</code> file, then restart the dev server.
        </p>
      </div>
    </div>
  )
}
