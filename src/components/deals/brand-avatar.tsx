import { cn } from '#/lib/utils'

/** A brand's uploaded logo, or a first-letter fallback avatar when it has none. */
export function BrandAvatar({ name, logoUrl, className }: { name: string; logoUrl?: string; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      className={cn(
        // Inherits the card's own text colour instead of pinning --charm-ink-soft. This avatar is
        // rendered inside deal/partnership cards whose background is user-chosen, so a fixed
        // foreground is light-on-light for half of them — measured 1.17:1 on real cards. Inheriting
        // means it is always as readable as the card title beside it.
        'flex shrink-0 items-center justify-center rounded-full bg-[var(--surface-nested)] font-semibold text-current opacity-80',
        className,
      )}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  )
}
