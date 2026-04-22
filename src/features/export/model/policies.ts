import { sessionPredicates as base } from '../../../entities/session'
import type { PolicyFn } from '../../../shared/lib/access-policy'
import type { Action } from '../../../shared/config/actions'

export const exportPolicies: Partial<Record<Action, PolicyFn>> = {
  'export:page:view':    (ctx) => base.canExport(ctx),
  'export:tab:view':     (ctx) => base.canExport(ctx),
  'export:data:parquet': (ctx) => base.canSeeExperimental(ctx),
}
