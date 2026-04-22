export interface ExtendedAccess {
  flag: string
  addRoles?: string[]
  addOperationIds?: string[]
  removeExcludeRoles?: string[]
  removeExcludeOperationIds?: string[]
}

export interface AccessRule {
  roles?: string[]
  operationIds?: string[]
  excludeRoles?: string[]
  excludeOperationIds?: string[]
  extendedAccess?: ExtendedAccess[]
}

export type AccessMatrix<TKey extends string = string> = Record<TKey, AccessRule>
