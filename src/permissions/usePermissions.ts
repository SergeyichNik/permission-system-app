import { useCallback, useMemo } from 'react'
import { usePermissionsStore } from '../store/permissionsStore'
import { resolvePermission } from './resolver'
import type { Action, CanFn } from './types'

export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()

  const ctx = useMemo(
    () => ({ roles, operationIds, featureFlags }),
    [roles, operationIds, featureFlags]
  )

  const can = useCallback<CanFn>(
    (action: Action): boolean => resolvePermission(action, ctx),
    [ctx]
  )

  return { can, ctx }
}
