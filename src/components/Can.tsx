import type { ReactNode } from 'react'
import { usePermissions } from '../permissions/usePermissions'
import type { Action } from '../permissions/types'

interface CanProps {
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ action, children, fallback = null }: CanProps) {
  const { can } = usePermissions()
  return can(action) ? <>{children}</> : <>{fallback}</>
}
