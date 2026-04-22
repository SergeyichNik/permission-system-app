import { useEffect, type ReactNode } from 'react'
import { usePermissionsStore } from '../../entities/session'

interface Props {
  roles: string[]
  operationIds: string[]
  featureFlags: Record<string, boolean>
  children: ReactNode
}

export function PermissionsProvider({
  roles,
  operationIds,
  featureFlags,
  children,
}: Props) {
  const setPermissions = usePermissionsStore((s) => s.setPermissions)

  useEffect(() => {
    setPermissions({ roles, operationIds, featureFlags })
  }, [roles, operationIds, featureFlags, setPermissions])

  return <>{children}</>
}
