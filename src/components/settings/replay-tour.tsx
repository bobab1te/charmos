import { Compass } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useProductTour } from '#/lib/product-tour'

/**
 * The way back into the tour once it has been dismissed or paused.
 *
 * Without this, "Continue later" would be a promise the app can't keep — there'd be nowhere to
 * continue from. A paused tour resumes at its saved step; a finished one replays from the start.
 */
export function ReplayTour() {
  const { status, stepIndex, stepCount, resume, restart } = useProductTour()
  const paused = status === 'later'

  return (
    <div className="charm-glass flex items-center justify-between gap-4 rounded-2xl p-5">
      <div className="flex-1">
        <h2 className="font-display text-sm font-semibold text-[var(--charm-ink)]">Product tour</h2>
        <p className="text-sm text-[var(--charm-ink-soft)]">
          {paused
            ? `Paused at step ${stepIndex + 1} of ${stepCount}. Pick up where you left off.`
            : 'A quick walk through partnerships, AI deal parsing, the scrapbook, and customization.'}
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={paused ? resume : restart} className="shrink-0 gap-1.5">
        <Compass className="size-3.5" />
        {paused ? 'Resume tour' : 'Replay tour'}
      </Button>
    </div>
  )
}
