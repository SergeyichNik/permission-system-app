export interface ExtendedAccess {
  flag: string
  roles?: string[]
  operationIds?: string[]
}

export interface TaskTypeAccess {
  roles?: string[]
  operationIds?: string[]
  excludeRoles?: string[]
  extendedAccess?: ExtendedAccess[]
}
