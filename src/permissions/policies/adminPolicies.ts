import { base } from '../base'
import type { PolicyFn, Action } from '../types'

export const adminPolicies: Partial<Record<Action, PolicyFn>> = {
  'admin:page:view': (ctx) => base.isAdmin(ctx),
}
