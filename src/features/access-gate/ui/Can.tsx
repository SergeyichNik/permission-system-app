import type { ReactNode } from 'react'
import { usePermissions } from '../model/usePermissions'
import type { Action } from '../../../shared/config/actions'

interface CanProps {
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ action, children, fallback = null }: CanProps) {
  const { can } = usePermissions()
  return can(action) ? <>{children}</> : <>{fallback}</>
}
