import type { PolicyFn } from '../../shared/lib/access-policy'
import type { Action } from '../../shared/config/actions'
import { ordersPolicies } from '../../features/orders'
import { exportPolicies } from '../../features/export'
import { adminPolicies } from '../../features/admin'
import { commonPolicies } from './common-policies'

export const appPolicies: Record<Action, PolicyFn> = {
  ...commonPolicies,
  ...ordersPolicies,
  ...exportPolicies,
  ...adminPolicies,
} as Record<Action, PolicyFn>
