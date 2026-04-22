import type { CanFn, UserContext } from '../permissions/types'

export interface AccessGatedItem {
  policy?: (can: CanFn, ctx: UserContext) => boolean
  allowedIn?: string[]
}

export interface AccessOverride<T> {
  when: (can: CanFn, ctx: UserContext, domain?: string) => boolean
  patch: Partial<T> | ((item: T) => Partial<T>)
}
