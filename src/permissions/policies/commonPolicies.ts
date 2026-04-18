import type { PolicyFn, Action } from '../types'

export const commonPolicies: Partial<Record<Action, PolicyFn>> = {
  'common:experimental:access': () => true,
  'common:dashboard:view':      () => true,
}
