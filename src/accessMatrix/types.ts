export interface ExtendedAccess {
  flag: string
  roles?: string[]
  operationIds?: string[]
  overrideExcludes?: boolean
}

export interface TaskTypeAccess {
  roles?: string[]
  operationIds?: string[]
  excludeRoles?: string[]
  excludeOperationIds?: string[]
  extendedAccess?: ExtendedAccess[]
}
