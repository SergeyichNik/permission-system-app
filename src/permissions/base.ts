import type { UserContext } from './types'

export const base = {
  isAdmin: (ctx: UserContext) =>
    ctx.roles.has('admin'),

  isManager: (ctx: UserContext) =>
    ctx.roles.has('admin') || ctx.roles.has('manager'),

  isViewer: (ctx: UserContext) =>
    ctx.roles.has('viewer'),

  canManageOrders: (ctx: UserContext) =>
    base.isManager(ctx) || ctx.operationIds.has('OP_ORDERS'),

  canExport: (ctx: UserContext) =>
    base.isAdmin(ctx) || ctx.operationIds.has('OP_EXPORT'),

  experimentalEnabled: (ctx: UserContext) =>
    ctx.featureFlags.get('experimental_options') === true,

  extendedPriorityEnabled: (ctx: UserContext) =>
    ctx.featureFlags.get('extended_priority') === true,

  canUsePriorityHigh: (ctx: UserContext) => {
    const baseAccess =
      ctx.operationIds.has('OP_PREMIUM') ||
      ctx.operationIds.has('OP_ENTERPRISE')

    const extendedAccess =
      base.extendedPriorityEnabled(ctx) &&
      (ctx.operationIds.has('OP_TEAM') ||
        ctx.operationIds.has('OP_BUSINESS'))

    return baseAccess || extendedAccess
  },

  canSeeExperimental: (ctx: UserContext) =>
    base.experimentalEnabled(ctx) &&
    (base.isAdmin(ctx) || ctx.operationIds.has('OP_EXPERIMENTAL')),
}
