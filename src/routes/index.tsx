import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { Eye, SlidersHorizontal } from 'lucide-react'
import { ParallaxHero } from '#/components/charm/parallax-hero'
import { DecorativeShapes } from '#/components/charm/decorative-shapes'
import { SiteNav } from '#/components/charm/site-nav'
import { MetricsGrid, METRIC_WIDGET_IDS } from '#/components/dashboard/metrics-grid'
import { DealPipeline } from '#/components/dashboard/deal-pipeline'
import { UpcomingDeadlines } from '#/components/dashboard/upcoming-deadlines'
import { UnassignedIdeas } from '#/components/dashboard/unassigned-ideas'
import { EarningsChart } from '#/components/dashboard/earnings-chart'
import { useWidgetVisibility } from '#/lib/use-widget-visibility'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'

export const Route = createFileRoute('/')({ component: Dashboard })

const WIDGET_IDS = {
  ...METRIC_WIDGET_IDS,
  pipeline: 'widget.pipeline',
  deadlines: 'widget.deadlines',
  ideas: 'widget.ideas',
  chart: 'widget.chart',
} as const

const WIDGET_LABELS: Record<string, string> = {
  [METRIC_WIDGET_IDS.earnings]: 'Earnings this month',
  [METRIC_WIDGET_IDS.activeDeals]: 'Active deals',
  [METRIC_WIDGET_IDS.dueThisWeek]: 'Due this week',
  [METRIC_WIDGET_IDS.followUp]: 'Needs follow-up',
  [WIDGET_IDS.pipeline]: 'Deal Pipeline',
  [WIDGET_IDS.deadlines]: 'Upcoming Deadlines',
  [WIDGET_IDS.ideas]: 'Unassigned Ideas',
  [WIDGET_IDS.chart]: 'Monthly Earnings',
}

function Dashboard() {
  const { isHidden, hide, show, hidden } = useWidgetVisibility()

  return (
    <div className="relative min-h-screen">
      <DecorativeShapes />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <ParallaxHero />

        <div className="flex items-center justify-between">
          <SiteNav />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="charm-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--charm-ink-soft)] transition hover:text-[var(--charm-ink)]"
              >
                <SlidersHorizontal className="size-3.5" />
                Manage widgets
                {hidden.length > 0 && (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-foreground)]">
                    {hidden.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="charm-glass w-56 border-0 p-2">
              {hidden.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-[var(--charm-ink-soft)]">All widgets are visible.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {hidden.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => show(id)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-[var(--charm-ink)] transition hover:bg-white/50"
                      >
                        {WIDGET_LABELS[id] ?? id}
                        <Eye className="size-3.5 text-[var(--charm-ink-soft)]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <AnimatePresence mode="popLayout">
          <MetricsGrid key="metrics" isHidden={isHidden} hide={hide} />
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {!isHidden(WIDGET_IDS.pipeline) && (
              <div key="pipeline" className="lg:col-span-2">
                <DealPipeline onHide={() => hide(WIDGET_IDS.pipeline)} />
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
    </div>
  )
}
