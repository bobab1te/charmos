import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Handshake,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { useSidebarCollapsed } from '#/lib/use-sidebar'
import { cn } from '#/lib/utils'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/brand-deals', label: 'Brand Deals', icon: Handshake },
  { to: '/scrapbook', label: 'Scrapbook', icon: NotebookPen },
  { to: '/finances', label: 'Finances', icon: Wallet },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const

export function SidebarNav() {
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    <aside
      className={cn(
        'charm-glass sticky top-0 z-20 flex h-screen shrink-0 flex-col rounded-none border-r border-white/40 p-3 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Sparkles className="size-4" />
          </span>
          {!collapsed && (
            <span className="truncate font-display text-base font-semibold text-[var(--charm-ink)]">CharmOS</span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="shrink-0 rounded-full p-1.5 text-[var(--charm-ink-soft)] transition hover:bg-white/50 hover:text-[var(--charm-ink)]"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand sidebar"
          className="mb-3 flex items-center justify-center self-center rounded-full p-1.5 text-[var(--charm-ink-soft)] transition hover:bg-white/50 hover:text-[var(--charm-ink)]"
        >
          <ChevronsRight className="size-4" />
        </button>
      )}

      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const Icon = link.icon
          const item = (
            <Link
              to={link.to}
              activeOptions={{ exact: true }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--charm-ink-soft)] transition hover:bg-white/50 hover:text-[var(--charm-ink)]',
                'data-[status=active]:bg-[var(--accent)] data-[status=active]:text-[var(--accent-foreground)]',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          )

          if (!collapsed) {
            return <div key={link.to}>{item}</div>
          }

          return (
            <Tooltip key={link.to}>
              <TooltipTrigger asChild>{item}</TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/40 px-1 pt-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--charm-pink),var(--charm-lavender-deep))] text-xs font-semibold text-white">
          A
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--charm-ink)]">Amanda</span>
            <button
              type="button"
              aria-label="Log out"
              className="shrink-0 rounded-full p-1.5 text-[var(--charm-ink-soft)] transition hover:bg-white/50 hover:text-[var(--charm-ink)]"
            >
              <LogOut className="size-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
