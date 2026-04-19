import type { UserContext } from '../permissions/types'
import { TASK_TYPE_ACCESS } from './taskTypeAccess'

export function canSeeTaskType(id: string, ctx: UserContext): boolean {
  const access = TASK_TYPE_ACCESS[id]

  if (!access) return true

  if (access.excludeRoles?.some((r) => ctx.roles.has(r))) return false

  const hasBaseRole = access.roles?.some((r) => ctx.roles.has(r)) ?? false
  const hasBaseOp   = access.operationIds?.some((op) => ctx.operationIds.has(op)) ?? false

  const whitelistDefined = !!(access.roles || access.operationIds)
  // when no whitelist but extendedAccess exists, require flag-based access (not open to all)
  const hasBaseAccess = whitelistDefined
    ? hasBaseRole || hasBaseOp
    : !access.extendedAccess

  if (hasBaseAccess) return true

  return (
    access.extendedAccess?.some((ext) => {
      if (!ctx.featureFlags.get(ext.flag)) return false

      const hasExtRole = ext.roles?.some((r) => ctx.roles.has(r)) ?? false
      const hasExtOp   = ext.operationIds?.some((op) => ctx.operationIds.has(op)) ?? false

      const extWhitelistDefined = !!(ext.roles || ext.operationIds)
      return extWhitelistDefined ? hasExtRole || hasExtOp : true
    }) ?? false
  )
}
