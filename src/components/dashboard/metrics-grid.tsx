import { AlertCircle, CalendarClock, HeartHandshake, Wallet } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCharmStore } from '#/lib/charm-store'
import { computeMetrics } from '#/lib/derived'
import { MetricCard } from './metric-card'

const WIDGET_IDS = {
  earnings: 'metric.earnings',
  activeDeals: 'metric.active-deals',
  dueThisWeek: 'metric.due-this-week',
  followUp: 'metric.needs-follow-up',
} as const

interface MetricsGridProps {
  isHidden: (id: string) => boolean
  hide: (id: string) => void
}

export function MetricsGrid({ isHidden, hide }: MetricsGridProps) {
  const { deals, ledger } = useCharmStore()
  const metrics = computeMetrics(deals, ledger)

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const cards = [
    {
      id: WIDGET_IDS.earnings,
      label: 'Earnings this month',
      value: currency.format(metrics.earningsThisMonth),
      icon: <Wallet className="size-4.5" />,
      accentClass: 'bg-[var(--accent)]',
      hint: 'From paid deals & ledger entries',
    },
    {
      id: WIDGET_IDS.activeDeals,
      label: 'Active deals',
      value: String(metrics.activeDeals),
      icon: <HeartHandshake className="size-4.5" />,
      accentClass: 'bg-[var(--charm-lavender-deep)]',
      hint: 'Confirmed or live right now',
    },
    {
      id: WIDGET_IDS.dueThisWeek,
      label: 'Due this week',
      value: String(metrics.dueThisWeek),
      icon: <CalendarClock className="size-4.5" />,
      accentClass: 'bg-[var(--charm-blue-deep)]',
      hint: 'Deliverables due in the next 7 days',
    },
    {
      id: WIDGET_IDS.followUp,
      label: 'Needs follow-up',
      value: String(metrics.needsFollowUp),
      icon: <AlertCircle className="size-4.5" />,
      accentClass: 'bg-[var(--urgency-orange)]',
      hint: 'Negotiating, quiet for 7+ days',
    },
  ]

  const visible = cards.filter((c) => !isHidden(c.id))
  if (visible.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {visible.map((card) => (
          <MetricCard
            key={card.id}
            label={card.label}
            value={card.value}
            icon={card.icon}
            hint={card.hint}
            accentClass={card.accentClass}
            onHide={() => hide(card.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export const METRIC_WIDGET_IDS = WIDGET_IDS
