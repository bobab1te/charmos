import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DecorativeShapes } from '#/components/charm/decorative-shapes'
import { SidebarNav } from '#/components/charm/sidebar-nav'
import { getCurrentUserAndProfile } from '#/server/auth'
import { useThemeContext } from '#/lib/theme-context'
import { CurrencyProvider } from '#/lib/currency-context'

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
          <DecorativeShapes />
          <Outlet />
        </div>
      </div>
    </CurrencyProvider>
  )
}
