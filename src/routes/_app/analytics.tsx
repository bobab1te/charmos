import { createFileRoute } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/_app/analytics')({ component: AnalyticsPage })

function AnalyticsPage() {
  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="charm-glass flex flex-col items-center gap-3 rounded-3xl p-16 text-center">
        <TrendingUp className="size-8 text-[var(--charm-ink-soft)]" />
        <h1 className="mt-2 font-display-bold text-3xl font-semibold text-[var(--charm-ink)]">Creator Analytics</h1>
        <p className="max-w-md text-sm text-[var(--charm-ink-soft)]">
          Growth insights across your platforms are coming soon.
        </p>
      </div>
    </div>
  )
}
