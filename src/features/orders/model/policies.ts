import { sessionPredicates as base } from '../../../entities/session'
import type { PolicyFn } from '../../../shared/lib/access-policy'
import type { Action } from '../../../shared/config/actions'

export const ordersPolicies: Partial<Record<Action, PolicyFn>> = {
  'orders:page:view':           (ctx) => base.canManageOrders(ctx),
  'orders:tab:pending':         (ctx) => base.canManageOrders(ctx),
  'orders:tab:export':          (ctx) => base.canExport(ctx),
  'orders:task:create_feature': (ctx) => base.canManageOrders(ctx),
  'orders:task:experimental':   (ctx) => base.canSeeExperimental(ctx),
  'orders:priority:high':       (ctx) => base.canUsePriorityHigh(ctx),
  'orders:priority:critical':   (ctx) => base.isAdmin(ctx),
}
