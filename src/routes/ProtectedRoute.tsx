import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../permissions/usePermissions'
import { usePermissionsStore } from '../store/permissionsStore'
import { ROUTE_CONFIG } from './routeConfig'
import type { Action } from '../permissions/types'

export function ProtectedRoute({
  action,
  redirectTo = '/dashboard',
}: {
  action: Action
  redirectTo?: string
}) {
  const { can } = usePermissions()
  const initialized = usePermissionsStore((s) => s.initialized)

  if (!initialized) return <div>Loading…</div>
  if (can(action)) return <Outlet />

  const redirectRoute = ROUTE_CONFIG.find((r) => r.path === redirectTo)
  if (redirectRoute && !can(redirectRoute.action)) {
    return <div>403 — You do not have access to this resource.</div>
  }

  return <Navigate to={redirectTo} replace />
}
