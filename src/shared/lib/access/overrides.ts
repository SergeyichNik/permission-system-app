import type { CanFn, UserContext } from '../access-policy/types'
import type { AccessOverride } from './types'

export function applyOverrides<T extends { overrides?: AccessOverride<T>[] }>(
  item: T,
  can: CanFn,
  ctx: UserContext,
  domain?: string
): T {
  const matched = (item.overrides ?? []).filter((o) =>
    o.when(can, ctx, domain)
  )
  if (matched.length === 0) return item
  return matched.reduce<T>((acc, o) => {
    const patch = typeof o.patch === 'function' ? o.patch(acc) : o.patch
    return { ...acc, ...patch }
  }, item)
}
