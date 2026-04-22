import type { AccessMatrix, AccessRule } from './types'

export function validateAccessMatrix<TKey extends string>(
  matrix: AccessMatrix<TKey>,
  label: string
): void {
  if (!import.meta.env.DEV) return

  for (const [id, rule] of Object.entries(matrix) as [string, AccessRule][]) {
    const tag = `[AccessMatrix:${label}] "${id}":`

    for (const ext of rule.extendedAccess ?? []) {
      const addToBlacklistedRole = ext.addRoles?.some(r =>
        rule.excludeRoles?.includes(r) &&
        !ext.removeExcludeRoles?.includes(r)
      )
      if (addToBlacklistedRole) {
        console.warn(
          `${tag} flag "${ext.flag}" adds roles that are still in excludeRoles. ` +
          `Add removeExcludeRoles to lift the ban first, otherwise addRoles has no effect.`
        )
      }

      const addToBlacklistedOp = ext.addOperationIds?.some(op =>
        rule.excludeOperationIds?.includes(op) &&
        !ext.removeExcludeOperationIds?.includes(op)
      )
      if (addToBlacklistedOp) {
        console.warn(
          `${tag} flag "${ext.flag}" adds operationIds that are still in excludeOperationIds. ` +
          `Add removeExcludeOperationIds to lift the ban first.`
        )
      }

      const removeNonExistent = ext.removeExcludeRoles?.some(r =>
        !rule.excludeRoles?.includes(r)
      )
      if (removeNonExistent) {
        console.warn(
          `${tag} flag "${ext.flag}" has removeExcludeRoles with roles ` +
          `not present in excludeRoles. This patch has no effect.`
        )
      }

      const noBaseRestriction =
        rule.roles === undefined &&
        rule.operationIds === undefined &&
        !rule.excludeRoles?.length &&
        !rule.excludeOperationIds?.length

      if (noBaseRestriction && rule.extendedAccess?.length) {
        console.warn(
          `${tag} has extendedAccess but no base restriction. ` +
          `All users pass base check — extendedAccess never fires. ` +
          `Add roles:[] to close base access if flag-only behavior is intended.`
        )
      }
    }
  }
}
