import { useEffect } from 'react'
import { format } from 'date-fns'
import { CircleDollarSign, Undo2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useCharmStore } from '#/lib/charm-store'

export function PartnershipCycleHistory({ partnershipId }: { partnershipId: string }) {
  const { partnershipPaymentCycles, backfillPastPartnershipCycles, confirmPartnershipCycle, unconfirmPartnershipCycle } =
    useCharmStore()

  // Fills in any elapsed-but-missing cycles once the history is actually looked at — e.g. a
  // partnership entered into the app well after it started, so there's something here to
  // confirm/mark paid for the months already gone by.
  useEffect(() => {
    backfillPastPartnershipCycles(partnershipId)
  }, [partnershipId, backfillPastPartnershipCycles])

  const cycles = partnershipPaymentCycles
    .filter((c) => c.partnershipId === partnershipId)
    .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())

  if (cycles.length === 0) {
    return <p className="text-xs text-[var(--charm-ink-soft)]">No payment cycles yet.</p>
  }

  return (
    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
      {cycles.map((cycle) => {
        const currency = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: cycle.currency,
          maximumFractionDigits: 0,
        })
        return (
          <div key={cycle.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/50 p-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--charm-ink)]">
                {format(new Date(cycle.periodStart), 'MMM d')} – {format(new Date(cycle.periodEnd), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-[var(--charm-ink-soft)]">
                {currency.format(cycle.expectedAmount)}
                {cycle.status === 'confirmed' && cycle.confirmedAt
                  ? ` · Confirmed ${format(new Date(cycle.confirmedAt), 'MMM d, yyyy')}`
                  : ' · Unconfirmed'}
              </p>
            </div>
            {cycle.status === 'confirmed' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => unconfirmPartnershipCycle(cycle.id)}
                className="shrink-0 gap-1"
              >
                <Undo2 className="size-3.5" /> Undo
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => confirmPartnershipCycle(cycle.id)}
                className="shrink-0 gap-1"
              >
                <CircleDollarSign className="size-3.5" /> Mark paid
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
