import { base } from '../base'
import type { PolicyFn, Action } from '../types'

export const exportPolicies: Partial<Record<Action, PolicyFn>> = {
  'export:page:view':    (ctx) => base.canExport(ctx),
  'export:tab:view':     (ctx) => base.canExport(ctx),
  'export:data:parquet': (ctx) => base.canSeeExperimental(ctx),
}
