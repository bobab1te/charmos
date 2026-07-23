import { cn } from '#/lib/utils'

/** The CharmOS app mark — one shared component so the icon only needs updating in one place. */
export function Logo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="CharmOS" className={cn('shrink-0 object-contain', className)} />
}
