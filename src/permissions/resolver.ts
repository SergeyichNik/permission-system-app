import { policies } from './policies'
import type { Action, UserContext } from './types'

export function resolvePermission(action: Action, ctx: UserContext): boolean {
  const policy = policies[action]
  if (!policy) return false
  return policy(ctx)
}
