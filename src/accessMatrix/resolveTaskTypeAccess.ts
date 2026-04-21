import type { UserContext } from '../permissions/types'
import type { TaskTypeAccess } from './types'
import { TASK_TYPE_ACCESS } from './taskTypeAccess'

export function canSeeTaskType(id: string, ctx: UserContext): boolean {
  const access = TASK_TYPE_ACCESS[id]

  if (!access) return true

  const blacklistOverridden = access.extendedAccess?.some(ext => {
    if (!ext.overrideExcludes) return false
    if (!ctx.featureFlags.get(ext.flag)) return false

    const hasExtRole = ext.roles?.some(r => ctx.roles.has(r)) ?? false
    const hasExtOp   = ext.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
    const extWhitelistDefined = !!(ext.roles || ext.operationIds)

    return extWhitelistDefined ? hasExtRole || hasExtOp : true
  }) ?? false

  if (!blacklistOverridden) {
    if (access.excludeRoles?.some(r => ctx.roles.has(r))) return false
    if (access.excludeOperationIds?.some(op => ctx.operationIds.has(op))) return false
  }

  const whitelistDefined = !!(access.roles || access.operationIds)
  const hasBaseRole = access.roles?.some(r => ctx.roles.has(r)) ?? false
  const hasBaseOp   = access.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
  const hasBaseAccess = whitelistDefined ? hasBaseRole || hasBaseOp : true

  if (hasBaseAccess) return true

  return access.extendedAccess?.some(ext => {
    if (!ctx.featureFlags.get(ext.flag)) return false

    const hasExtRole = ext.roles?.some(r => ctx.roles.has(r)) ?? false
    const hasExtOp   = ext.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
    const extWhitelistDefined = !!(ext.roles || ext.operationIds)

    return extWhitelistDefined ? hasExtRole || hasExtOp : true
  }) ?? false
}

export function validateAccessMatrix(matrix: Record<string, TaskTypeAccess>) {
  if (process.env.NODE_ENV !== 'development') return

  for (const [id, access] of Object.entries(matrix)) {
    access.extendedAccess?.forEach(ext => {
      const conflictRole = ext.roles?.some(r => access.excludeRoles?.includes(r))
      const conflictOp   = ext.operationIds?.some(op => access.excludeOperationIds?.includes(op))

      if ((conflictRole || conflictOp) && !ext.overrideExcludes) {
        console.warn(
          `[AccessMatrix] "${id}": extendedAccess flag "${ext.flag}" targets blacklisted ` +
          `roles/operationIds but "overrideExcludes" is not set. ` +
          `Flag will never grant access. Add overrideExcludes:true if intentional.`
        )
      }

      const hasBlacklist = !!(access.excludeRoles?.length || access.excludeOperationIds?.length)
      if (ext.overrideExcludes && !hasBlacklist) {
        console.warn(
          `[AccessMatrix] "${id}": extendedAccess flag "${ext.flag}" has overrideExcludes:true ` +
          `but no excludeRoles or excludeOperationIds exist. overrideExcludes is pointless here.`
        )
      }
    })
  }
}
