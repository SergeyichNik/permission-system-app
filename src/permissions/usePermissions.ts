import { useCallback, useMemo } from 'react'
import { usePermissionsStore } from '../store/permissionsStore'
import { resolvePermission } from './resolver'
import type { Action } from './types'

export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()

  const ctx = useMemo(
    () => ({ roles, operationIds, featureFlags }),
    [roles, operationIds, featureFlags]
  )

  const can = useCallback(
    (action: string): boolean => resolvePermission(action as Action, ctx),
    [ctx]
  )

  return { can, ctx }
}
