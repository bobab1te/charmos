import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { EarningsChart } from '#/components/dashboard/earnings-chart'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'

export const Route = createFileRoute('/_app/finances')({ component: FinancesPage })

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(
    amount,
  )
}

function FinancesPage() {
  const { ledger, brandById, dealById, partnershipById } = useCharmStore()
  const { displayCurrency, convert } = useCurrency()
  const sorted = [...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="mt-2 font-display-bold text-3xl font-semibold text-[var(--charm-ink)]">Finances</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">Revenue trend and every ledger entry, in one place.</p>
      </div>

      <EarningsChart />

      <div className="charm-glass rounded-2xl p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-[var(--charm-ink)]">Transactions</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-[var(--charm-ink-soft)]">No ledger entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/40">
            {sorted.map((entry) => {
              // Auto-generated entries link back to their deal/partnership via id — but that
              // record may have since been deleted (deals/partnerships are ON DELETE SET NULL,
              // not cascaded, so the entry itself always survives as a historical record).
              // Only offer the link when the target still actually exists.
              const linkedDeal = entry.dealId ? dealById(entry.dealId) : undefined
              const linkedPartnership = entry.partnershipId ? partnershipById(entry.partnershipId) : undefined
              return (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--charm-ink)]">{entry.description}</p>
                    <p className="text-xs text-[var(--charm-ink-soft)]">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                      {entry.brandId && ` · ${brandById(entry.brandId)?.name ?? 'Unknown brand'}`}
                    </p>
                    {linkedDeal && (
                      <Link
                        to="/brand-deals"
                        search={{ openDeal: linkedDeal.id }}
                        className="mt-0.5 flex items-center gap-0.5 text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        View deal <ArrowRight className="size-3" />
                      </Link>
                    )}
                    {linkedPartnership && (
                      <Link
                        to="/brand-deals"
                        search={{ openPartnership: linkedPartnership.id }}
                        className="mt-0.5 flex items-center gap-0.5 text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        View partnership <ArrowRight className="size-3" />
                      </Link>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={
                        'text-sm font-semibold ' +
                        (entry.type === 'income' ? 'text-[var(--urgency-green)]' : 'text-[var(--urgency-red)]')
                      }
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatMoney(Math.abs(entry.amount), entry.currency)}
                    </span>
                    {entry.currency !== displayCurrency && (
                      <p className="text-xs text-[var(--charm-ink-soft)]">
                        ≈ {formatMoney(Math.abs(convert(entry.amount, entry.currency)), displayCurrency)}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-[var(--charm-ink-soft)]">
          Expense categories and budgeting tools are not built yet.
        </p>
      </div>
    </div>
  )
}
