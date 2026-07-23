import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DecorativeShapes } from '#/components/charm/decorative-shapes'
import type { ShapeIntensity } from '#/components/charm/decorative-shapes'
import { SidebarNav } from '#/components/charm/sidebar-nav'
import { getCurrentUserAndProfile } from '#/server/auth'
import { useThemeContext } from '#/lib/theme-context'
import { CurrencyProvider } from '#/lib/currency-context'

/**
 * Finances is the one view where number-accuracy is the whole point, so it gets the least
 * background motion; the dashboard is the "hero" view and gets the full treatment; everything
 * else (deal pipeline/partnerships, scrapbook, settings, analytics) is data-adjacent but not as
 * number-dense, so it gets a toned-down middle ground.
 */
function intensityForPath(pathname: string): ShapeIntensity {
  if (pathname.startsWith('/dashboard')) return 'full'
  if (pathname.startsWith('/finances')) return 'minimal'
  return 'toned-down'
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
  const { setTheme } = useThemeContext()
  const pathname = useLocation({ select: (location) => location.pathname })

  // The profile's saved theme is the source of truth once authenticated —
  // flows through the same shared ThemeProvider pre-login routes fall back to.
  useEffect(() => {
    setTheme(profile.theme)
  }, [profile.theme, setTheme])

  return (
    <CurrencyProvider displayCurrency={profile.currency ?? 'USD'}>
      <div className="flex min-h-screen">
        <SidebarNav profile={profile} avatarUrl={user.avatarUrl} />
        <div className="relative min-h-screen flex-1 overflow-x-hidden">
          <DecorativeShapes intensity={intensityForPath(pathname)} />
          <Outlet />
        </div>
      </div>
    </CurrencyProvider>
  )
}
