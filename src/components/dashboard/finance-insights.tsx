import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Repeat, Sparkles, TrendingUp } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { computeFinanceInsights } from '#/lib/derived'
import type { FinanceInsights as FinanceInsightsData } from '#/lib/derived'

/**
 * A compact read on how the creator's money is actually performing — the three questions the
 * year-to-date number on the metric card can't answer: what's the best deal I've landed, what
 * recurring income can I count on, and what is a typical deal worth.
 *
 * Yearly earnings is deliberately NOT repeated here; it already leads the metrics row above, and
 * showing the same figure twice on one screen invites the "why don't these match" question every
 * time a rounding or filter detail differs.
 *
 * Every figure comes from computeFinanceInsights, the same helper the metric card uses, which in
 * turn reads the shared revenueEvents list — so nothing here can drift from the Finances page.
 */

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'weekly',
  biweekly: 'every 2 weeks',
  monthly: 'monthly',
}

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--charm-ink-soft)]">
        {icon}
        {label}
      </span>
      <span className="font-display-bold text-xl font-semibold leading-tight text-[var(--charm-ink)] sm:text-2xl">
        {value}
      </span>
      {detail && <span className="truncate text-xs text-[var(--charm-ink-soft)]">{detail}</span>}
    </div>
  )
}

export function FinanceInsights({ onHide }: { onHide?: () => void }) {
  const { deals, ledger, brands, partnerships } = useCharmStore()
  const { displayCurrency, convert } = useCurrency()
  const insights = computeFinanceInsights(deals, ledger, brands, partnerships, convert, new Date())
  return <FinanceInsightsView insights={insights} displayCurrency={displayCurrency} onHide={onHide} />
}

/**
 * Presentation only, split from the store wiring above. Keeping it separate means the layout can be
 * rendered against fixtures without a signed-in store — which is how the awkward cases (a brand
 * name long enough to need truncating, no active retainer, nothing recorded at all) were checked,
 * since a real dataset shows whichever one it happens to contain.
 */
export function FinanceInsightsView({
  insights,
  displayCurrency,
  onHide,
}: {
  insights: FinanceInsightsData
  displayCurrency: string
  onHide?: () => void
}) {
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    maximumFractionDigits: 0,
  })

  const hasAnything = insights.largestDeal || insights.topRetainer || insights.averageDealSize !== undefined

  return (
    <WidgetCard
      title="Finance insights"
      icon={<TrendingUp className="size-4" />}
      onHide={onHide}
      headerAction={
        <Link
          to="/finances"
          className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-nested)] px-2.5 py-1 text-xs font-medium text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:text-[var(--charm-ink)] hover:shadow-sm active:scale-95 "
        >
          View Finance <ArrowUpRight className="size-3.5" />
        </Link>
      }
    >
      {!hasAnything ? (
        <p className="text-sm text-[var(--charm-ink-soft)]">
          Once a paid deal or retainer is recorded, your highlights show up here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
          <Stat
            icon={<Sparkles className="size-3.5" />}
            label="Largest deal"
            value={insights.largestDeal ? money.format(insights.largestDeal.amount) : '—'}
            detail={insights.largestDeal?.brandName}
          />
          <Stat
            icon={<Repeat className="size-3.5" />}
            label="Top retainer"
            value={insights.topRetainer ? `${money.format(insights.topRetainer.monthlyAmount)}/mo` : '—'}
            detail={
              insights.topRetainer
                ? `${insights.topRetainer.brandName} · billed ${CADENCE_LABEL[insights.topRetainer.cadence]}`
                : 'No active retainer'
            }
          />
          <Stat
            icon={<TrendingUp className="size-3.5" />}
            label="Average deal"
            value={insights.averageDealSize !== undefined ? money.format(insights.averageDealSize) : '—'}
            detail={
              insights.dealCount > 0
                ? `across ${insights.dealCount} paid ${insights.dealCount === 1 ? 'deal' : 'deals'}`
                : undefined
            }
          />
        </div>
      )}
    </WidgetCard>
  )
}
