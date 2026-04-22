import type { CanFn, UserContext } from '../permissions/types'

export interface AccessGatedItem {
  policy?: (can: CanFn, ctx: UserContext) => boolean
  allowedIn?: string[]
}
