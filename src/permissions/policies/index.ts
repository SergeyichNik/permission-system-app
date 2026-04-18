import type { Action, PolicyFn } from '../types'
import { ordersPolicies } from './ordersPolicies'
import { exportPolicies } from './exportPolicies'
import { adminPolicies } from './adminPolicies'
import { commonPolicies } from './commonPolicies'

export const policies: Record<Action, PolicyFn> = {
  ...commonPolicies,
  ...ordersPolicies,
  ...exportPolicies,
  ...adminPolicies,
} as Record<Action, PolicyFn>
