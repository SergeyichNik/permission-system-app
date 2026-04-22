import type { Action } from '../../config/actions'

export interface UserContext {
  roles: Set<string>
  operationIds: Set<string>
  featureFlags: Map<string, boolean>
}

export type PolicyFn = (ctx: UserContext) => boolean

export type CanFn = (action: Action) => boolean
