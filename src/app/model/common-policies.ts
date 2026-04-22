import type { PolicyFn } from '../../shared/lib/access-policy'
import type { Action } from '../../shared/config/actions'

export const commonPolicies: Partial<Record<Action, PolicyFn>> = {
  'common:experimental:access': () => true,
  'common:dashboard:view':      () => true,
}
