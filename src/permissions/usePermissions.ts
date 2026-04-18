import { useCallback } from 'react'
import { usePermissionsStore } from '../store/permissionsStore'
import { resolvePermission } from './resolver'
import type { Action, UserContext } from './types'

export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()

  const can = useCallback(
    (action: string): boolean => {
      const ctx: UserContext = { roles, operationIds, featureFlags }
      return resolvePermission(action as Action, ctx)
    },
    [roles, operationIds, featureFlags]
  )

  return { can }
}
