export interface UserContext {
  roles: Set<string>
  operationIds: Set<string>
  featureFlags: Map<string, boolean>
}

export type PolicyFn = (ctx: UserContext) => boolean

export type Action =
  // orders domain
  | 'orders:page:view'
  | 'orders:tab:pending'
  | 'orders:tab:export'
  | 'orders:task:create_feature'
  | 'orders:task:experimental'
  | 'orders:priority:high'
  | 'orders:priority:critical'
  // export domain
  | 'export:page:view'
  | 'export:tab:view'
  | 'export:data:parquet'
  // admin domain
  | 'admin:page:view'
  // common
  | 'common:experimental:access'
  | 'common:dashboard:view'
