import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DecorativeShapes } from '#/components/charm/decorative-shapes'
import { SidebarNav } from '#/components/charm/sidebar-nav'

export const Route = createFileRoute('/_app')({ component: AppLayout })

function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="relative min-h-screen flex-1 overflow-x-hidden">
        <DecorativeShapes />
        <Outlet />
      </div>
    </div>
  )
}
