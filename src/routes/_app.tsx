import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DecorativeShapes } from '#/components/charm/decorative-shapes'
import type { PageKey } from '#/components/charm/decorative-shapes'
import { DashboardAtmosphere } from '#/components/charm/dashboard-atmosphere'
import { SidebarNav } from '#/components/charm/sidebar-nav'
import { TourBubble } from '#/components/charm/tour-bubble'
import { getCurrentUserAndProfile } from '#/server/auth'
import { useThemeContext } from '#/lib/theme-context'
import { CurrencyProvider } from '#/lib/currency-context'
import { ProductTourProvider } from '#/lib/product-tour'

/** Each page gets its own fixed decorative arrangement — see PAGE_CONFIGS in decorative-shapes.tsx. */
function pageKeyForPath(pathname: string): PageKey {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/brand-deals')) return 'pipeline'
  if (pathname.startsWith('/scrapbook')) return 'scrapbook'
  if (pathname.startsWith('/finances')) return 'finances'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/analytics')) return 'analytics'
  return 'default'
}

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const result = await getCurrentUserAndProfile()

    if (!result.configured) throw redirect({ to: '/setup-required' })
    if (!result.user) throw redirect({ to: '/login' })
    if (!result.profile || !result.profile.onboarding_completed_at) throw redirect({ to: '/onboarding' })

    return { user: result.user, profile: result.profile }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user, profile } = Route.useRouteContext()
  const { applyProfileTheme } = useThemeContext()
  const pathname = useLocation({ select: (location) => location.pathname })

  // The profile's saved theme is the source of truth once authenticated — unless this device is set
  // to Auto, which applyProfileTheme deliberately leaves alone (see theme-context).
  useEffect(() => {
    applyProfileTheme(profile.theme)
  }, [profile.theme, applyProfileTheme])

  return (
    <CurrencyProvider displayCurrency={profile.currency ?? 'USD'}>
      {/* Inside the layout, not the root: the tour points at authenticated CRM pages, and its
          steps navigate between them — mounting it above the auth guard would let it drive a
          logged-out user around. */}
      <ProductTourProvider profile={profile}>
        <div className="flex min-h-screen">
          <SidebarNav profile={profile} avatarUrl={user.avatarUrl} />
          <div className="relative min-h-screen flex-1 overflow-x-hidden">
            {pageKeyForPath(pathname) === 'dashboard' && <DashboardAtmosphere />}
            <DecorativeShapes page={pageKeyForPath(pathname)} />
            <Outlet />
          </div>
        </div>
        <TourBubble />
      </ProductTourProvider>
    </CurrencyProvider>
  )
}
