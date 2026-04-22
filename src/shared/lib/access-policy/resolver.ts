import type { PolicyFn, UserContext } from './types'

export function resolvePermission<A extends string>(
  action: A,
  policies: Partial<Record<A, PolicyFn>>,
  ctx: UserContext
): boolean {
  const policy = policies[action]
  if (!policy) return false
  return policy(ctx)
}
