import { createFileRoute } from '@tanstack/react-router'
import { Eye, Palette } from 'lucide-react'
import { useWidgetVisibility } from '#/lib/use-widget-visibility'
import { WIDGET_LABELS } from '#/lib/widget-ids'

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage })

function SettingsPage() {
  const { hidden, show } = useWidgetVisibility()

  return (
    <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display-bold text-2xl font-semibold text-[var(--charm-ink)]">Settings</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">Control what shows up on your Dashboard.</p>
      </div>

      <div className="charm-glass rounded-2xl p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-[var(--charm-ink)]">Dashboard widgets</h2>
        {hidden.length === 0 ? (
          <p className="text-sm text-[var(--charm-ink-soft)]">Every widget is currently visible on the Dashboard.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {hidden.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => show(id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--charm-ink)] transition hover:bg-white/50"
                >
                  {WIDGET_LABELS[id] ?? id}
                  <span className="flex items-center gap-1 text-xs text-[var(--charm-ink-soft)]">
                    <Eye className="size-3.5" /> Show
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="charm-glass flex items-start gap-3 rounded-2xl p-5">
        <Palette className="mt-0.5 size-4.5 shrink-0 text-[var(--charm-ink-soft)]" />
        <div>
          <h2 className="font-display text-sm font-semibold text-[var(--charm-ink)]">Aura theme & dark mode</h2>
          <p className="text-sm text-[var(--charm-ink-soft)]">
            Custom accent colors and a dark mode toggle are not built yet.
          </p>
        </div>
      </div>
    </div>
  )
}
