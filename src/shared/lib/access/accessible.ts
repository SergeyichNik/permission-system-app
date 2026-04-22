import type { CanFn, UserContext } from '../access-policy/types'
import type { AccessGatedItem } from './types'

export function filterByPolicy<T extends AccessGatedItem>(
  items: T[],
  can: CanFn,
  ctx: UserContext
): T[] {
  return items.filter((item) => !item.policy || item.policy(can, ctx))
}

export function filterByDomain<T extends AccessGatedItem>(
  items: T[],
  domain: string
): T[] {
  return items.filter(
    (item) => !item.allowedIn || item.allowedIn.includes(domain)
  )
}

export function filterAccessible<T extends AccessGatedItem>(
  items: T[],
  can: CanFn,
  ctx: UserContext,
  domain?: string
): T[] {
  const gated = filterByPolicy(items, can, ctx)
  return domain ? filterByDomain(gated, domain) : gated
}
