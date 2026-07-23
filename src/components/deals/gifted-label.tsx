import { Gift } from 'lucide-react'
import { cn } from '#/lib/utils'

/** A $0 deal is treated as gifted wherever its amount would otherwise be shown — purely a
 * function of the amount itself, not the (independent) compensationType field, so it updates
 * immediately if the amount is edited away from 0. */
export function isGiftedAmount(amount: number): boolean {
  return amount === 0
}

export function GiftedLabel({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Gift className="size-3" /> Gifted
    </span>
  )
}
