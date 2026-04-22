import { sessionPredicates as base } from '../../../entities/session'
import type { PolicyFn } from '../../../shared/lib/access-policy'
import type { Action } from '../../../shared/config/actions'

export const adminPolicies: Partial<Record<Action, PolicyFn>> = {
  'admin:page:view': (ctx) => base.isAdmin(ctx),
}
