import { useCallback, useContext, useMemo } from 'react'
import { usePermissionsStore } from '../../../entities/session'
import {
  PoliciesContext,
  resolvePermission,
} from '../../../shared/lib/access-policy'
import type { CanFn } from '../../../shared/lib/access-policy'
import type { Action } from '../../../shared/config/actions'

export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()
  const policies = useContext(PoliciesContext)

  const ctx = useMemo(
    () => ({ roles, operationIds, featureFlags }),
    [roles, operationIds, featureFlags]
  )

  const can = useCallback<CanFn>(
    (action: Action) => resolvePermission(action, policies, ctx),
    [policies, ctx]
  )

  return { can, ctx }
}
