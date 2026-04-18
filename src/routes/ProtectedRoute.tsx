import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../permissions/usePermissions'
import type { Action } from '../permissions/types'

export function ProtectedRoute({
  action,
  redirectTo = '/dashboard',
}: {
  action: Action
  redirectTo?: string
}) {
  const { can } = usePermissions()
  return can(action) ? <Outlet /> : <Navigate to={redirectTo} replace />
}
