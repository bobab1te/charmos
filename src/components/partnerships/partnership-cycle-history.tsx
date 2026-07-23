import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CircleDollarSign, Undo2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useCharmStore } from '#/lib/charm-store'
import type { PartnershipPaymentCycle } from '#/lib/types'

/**
 * Click-to-edit amount for a single cycle — same pattern as DealCardNotes: text until clicked,
 * then a number input, committed on blur/Enter. Works whether the cycle is confirmed or not,
 * since the actual amount received can differ from the partnership's standard rate either way.
 */
function CycleAmount({
  cycle,
  onAmountChange,
}: {
  cycle: PartnershipPaymentCycle
  onAmountChange: (amount: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(cycle.expectedAmount))
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cycle.currency,
    maximumFractionDigits: 2,
  })

  function commit() {
    setEditing(false)
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== cycle.expectedAmount) {
      onAmountChange(parsed)
    } else {
      setDraft(String(cycle.expectedAmount))
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(String(cycle.expectedAmount))
            setEditing(false)
          }
        }}
        className="w-20 rounded border border-black/15 bg-white/80 px-1.5 py-0.5 text-xs text-[var(--charm-ink)] outline-none focus:border-[var(--accent)]"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(cycle.expectedAmount))
        setEditing(true)
      }}
      className="-mx-1 rounded px-1 underline decoration-dotted decoration-[var(--charm-ink-soft)] underline-offset-2 transition duration-150 ease-out hover:bg-black/5"
    >
      {currency.format(cycle.expectedAmount)}
    </button>
  )
}

export function PartnershipCycleHistory({ partnershipId }: { partnershipId: string }) {
  const {
    partnershipPaymentCycles,
    backfillPastPartnershipCycles,
    confirmPartnershipCycle,
    unconfirmPartnershipCycle,
    updatePartnershipCycleAmount,
  } = useCharmStore()

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
      {cycles.map((cycle) => (
        <div key={cycle.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/50 p-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--charm-ink)]">
              {format(new Date(cycle.periodStart), 'MMM d')} – {format(new Date(cycle.periodEnd), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-[var(--charm-ink-soft)]">
              <CycleAmount cycle={cycle} onAmountChange={(amount) => updatePartnershipCycleAmount(cycle.id, amount)} />
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
      ))}
    </div>
  )
}
