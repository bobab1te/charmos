import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { EarningsChart } from '#/components/dashboard/earnings-chart'
import { useCharmStore } from '#/lib/charm-store'

export const Route = createFileRoute('/_app/finances')({ component: FinancesPage })

function FinancesPage() {
  const { ledger, brandById } = useCharmStore()
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const sorted = [...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--charm-ink)]">Finances</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">Revenue trend and every ledger entry, in one place.</p>
      </div>

      <EarningsChart />

      <div className="charm-glass rounded-2xl p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-[var(--charm-ink)]">Transactions</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-[var(--charm-ink-soft)]">No ledger entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/40">
            {sorted.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--charm-ink)]">{entry.description}</p>
                  <p className="text-xs text-[var(--charm-ink-soft)]">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                    {entry.brandId && ` · ${brandById(entry.brandId)?.name ?? 'Unknown brand'}`}
                  </p>
                </div>
                <span
                  className={
                    'shrink-0 text-sm font-semibold ' +
                    (entry.type === 'income' ? 'text-[var(--urgency-green)]' : 'text-[var(--urgency-red)]')
                  }
                >
                  {entry.type === 'income' ? '+' : '-'}
                  {currency.format(Math.abs(entry.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[var(--charm-ink-soft)]">
          Expense categories and budgeting tools are not built yet.
        </p>
      </div>
    </div>
  )
}
