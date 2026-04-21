import type { AccessMatrix } from './types'
import type { UserContext } from '../permissions/types'
import { resolveAccess } from './resolveAccess'

export type ColumnId =
  | 'col_price'
  | 'col_internal_id'
  | 'col_courier_info'
  | 'col_experimental'

export const COLUMN_ACCESS: AccessMatrix<ColumnId> = {
  'col_price': {
    roles: ['admin', 'manager'],
  },
  'col_internal_id': {
    roles: ['admin'],
  },
  'col_courier_info': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showCourierInfo',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
    ],
  },
  'col_experimental': {
    roles: [],
    extendedAccess: [
      {
        flag: 'experimentalColumns',
        addRoles: ['admin', 'manager'],
      },
    ],
  },
}

export const canSeeColumn = (id: ColumnId, ctx: UserContext): boolean =>
  resolveAccess(COLUMN_ACCESS, id, ctx)
