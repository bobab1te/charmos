import { cn } from '#/lib/utils'

/** A brand's uploaded logo, or a first-letter fallback avatar when it has none. */
export function BrandAvatar({ name, logoUrl, className }: { name: string; logoUrl?: string; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-white/60 font-semibold text-[var(--charm-ink-soft)]',
        className,
      )}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  )
}
