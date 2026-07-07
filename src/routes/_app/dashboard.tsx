import { createFileRoute, Link } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { SlidersHorizontal } from 'lucide-react'
import { ParallaxHero } from '#/components/charm/parallax-hero'
import { MetricsGrid } from '#/components/dashboard/metrics-grid'
import { PipelineSummary } from '#/components/dashboard/pipeline-summary'
import { UpcomingDeadlines } from '#/components/dashboard/upcoming-deadlines'
import { UnassignedIdeas } from '#/components/dashboard/unassigned-ideas'
import { EarningsChart } from '#/components/dashboard/earnings-chart'
import { useWidgetVisibility } from '#/lib/use-widget-visibility'
import { WIDGET_IDS } from '#/lib/widget-ids'

export const Route = createFileRoute('/_app/dashboard')({ component: Dashboard })

function Dashboard() {
  const { isHidden, hide, hidden } = useWidgetVisibility()

  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <ParallaxHero />

      <div className="flex items-center justify-end">
        <Link
          to="/settings"
          className="charm-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--charm-ink-soft)] transition hover:text-[var(--charm-ink)]"
        >
          <SlidersHorizontal className="size-3.5" />
          Customize
          {hidden.length > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-foreground)]">
              {hidden.length}
            </span>
          )}
        </Link>
      </div>

      <AnimatePresence mode="popLayout">
        <MetricsGrid key="metrics" isHidden={isHidden} hide={hide} />
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {!isHidden(WIDGET_IDS.pipeline) && (
            <div key="pipeline" className="lg:col-span-2">
              <PipelineSummary onHide={() => hide(WIDGET_IDS.pipeline)} />
            </div>
          )}
          {!isHidden(WIDGET_IDS.deadlines) && (
            <div key="deadlines" className="lg:col-span-1">
              <UpcomingDeadlines onHide={() => hide(WIDGET_IDS.deadlines)} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {!isHidden(WIDGET_IDS.ideas) && <UnassignedIdeas key="ideas" onHide={() => hide(WIDGET_IDS.ideas)} />}
          {!isHidden(WIDGET_IDS.chart) && <EarningsChart key="chart" onHide={() => hide(WIDGET_IDS.chart)} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
