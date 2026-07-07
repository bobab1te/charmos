import { Link } from '@tanstack/react-router'

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/brands', label: 'Brands' },
] as const

export function SiteNav() {
  return (
    <nav className="charm-glass flex w-fit gap-1 rounded-full p-1">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          activeOptions={{ exact: link.to === '/' }}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--charm-ink-soft)] transition hover:text-[var(--charm-ink)] data-[status=active]:bg-[var(--accent)] data-[status=active]:text-[var(--accent-foreground)]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
