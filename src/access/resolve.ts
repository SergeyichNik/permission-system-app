import type { CanFn, UserContext } from '../permissions/types'
import type { AccessGatedItem, AccessOverride } from './types'
import { filterAccessible } from './accessible'
import { applyOverrides } from './overrides'

export function resolveGatedItems<
  T extends AccessGatedItem & { overrides?: AccessOverride<T>[] }
>(items: T[], can: CanFn, ctx: UserContext, domain?: string): T[] {
  return filterAccessible(items, can, ctx, domain).map((i) =>
    applyOverrides(i, can, ctx, domain)
  )
}
