import type { UserContext } from '../permissions/types'
import type { AccessMatrix, AccessRule, ExtendedAccess } from './types'

function applyExtensions(
  base: Required<Omit<AccessRule, 'extendedAccess'>>,
  ctx: UserContext,
  extensions: ExtendedAccess[] = []
): Required<Omit<AccessRule, 'extendedAccess'>> {
  const effective = {
    roles:               [...base.roles],
    operationIds:        [...base.operationIds],
    excludeRoles:        [...base.excludeRoles],
    excludeOperationIds: [...base.excludeOperationIds],
  }

  for (const ext of extensions) {
    if (!ctx.featureFlags.get(ext.flag)) continue

    if (ext.addRoles)
      effective.roles.push(...ext.addRoles)

    if (ext.addOperationIds)
      effective.operationIds.push(...ext.addOperationIds)

    if (ext.removeExcludeRoles)
      effective.excludeRoles = effective.excludeRoles
        .filter(r => !ext.removeExcludeRoles!.includes(r))

    if (ext.removeExcludeOperationIds)
      effective.excludeOperationIds = effective.excludeOperationIds
        .filter(op => !ext.removeExcludeOperationIds!.includes(op))
  }

  return effective
}

export function resolveAccess<TKey extends string>(
  matrix: AccessMatrix<TKey>,
  id: TKey,
  ctx: UserContext
): boolean {
  const rule = matrix[id]

  if (!rule) return true

  const effective = applyExtensions(
    {
      roles:               rule.roles ?? [],
      operationIds:        rule.operationIds ?? [],
      excludeRoles:        rule.excludeRoles ?? [],
      excludeOperationIds: rule.excludeOperationIds ?? [],
    },
    ctx,
    rule.extendedAccess
  )

  if (effective.excludeRoles.some(r => ctx.roles.has(r))) return false
  if (effective.excludeOperationIds.some(op => ctx.operationIds.has(op))) return false

  const whitelistDefined =
    rule.roles !== undefined ||
    rule.operationIds !== undefined

  if (!whitelistDefined) return true

  return (
    effective.roles.some(r => ctx.roles.has(r)) ||
    effective.operationIds.some(op => ctx.operationIds.has(op))
  )
}
