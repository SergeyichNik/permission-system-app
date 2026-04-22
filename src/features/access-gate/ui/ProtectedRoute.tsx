import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../model/usePermissions'
import { usePermissionsStore } from '../../../entities/session'
import type { Action } from '../../../shared/config/actions'

export function ProtectedRoute({
  action,
  redirectTo = '/dashboard',
  redirectAction,
}: {
  action: Action
  redirectTo?: string
  redirectAction?: Action
}) {
  const { can } = usePermissions()
  const initialized = usePermissionsStore((s) => s.initialized)

  if (!initialized) return <div>Loading…</div>
  if (can(action)) return <Outlet />

  if (redirectAction && !can(redirectAction)) {
    return <div>403 — You do not have access to this resource.</div>
  }

  return <Navigate to={redirectTo} replace />
}
