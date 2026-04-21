import type { AccessMatrix } from './types'
import type { UserContext } from '../permissions/types'
import { resolveAccess } from './resolveAccess'

export type TaskTypeId =
  | 'action_basic_view'
  | 'action_nobody'
  | 'action_hidden_by_default'
  | 'action_hidden_opens_for_roles'
  | 'action_admin_only'
  | 'action_pp_export'
  | 'action_pp_bulk'
  | 'action_no_courier_ever'
  | 'action_no_readonly'
  | 'action_pp_special'
  | 'action_pp_unblockable'
  | 'action_open_except_courier'
  | 'action_pp_priority'
  | 'action_pp_advanced'
  | 'action_pp_partner'
  | 'action_xx_experimental'
  | 'action_archive_restore'

export const TASK_TYPE_ACCESS: AccessMatrix<TaskTypeId> = {

  // ── BOUNDARY: visible to everyone ────────────────────────────────────────
  'action_basic_view': {},

  // ── BOUNDARY: visible to nobody, ever ────────────────────────────────────
  // roles defined but empty → whitelistDefined=true, no match possible, no flag can help
  'action_nobody': {
    roles: [],
    operationIds: [],
  },

  // ── BOUNDARY: nobody by default, flag opens for operationIds ─────────────
  // roles:[] closes base access; flag adds to effective whitelist
  'action_hidden_by_default': {
    roles: [],
    extendedAccess: [
      {
        flag: 'unlockForPremium',
        addOperationIds: ['OP_PREMIUM', 'OP_ENTERPRISE'],
      },
    ],
  },

  // ── BOUNDARY: nobody by default, flag opens for roles ────────────────────
  'action_hidden_opens_for_roles': {
    roles: [],
    extendedAccess: [
      {
        flag: 'betaAccess',
        addRoles: ['admin', 'manager'],
      },
    ],
  },

  // ── Role whitelist only ──────────────────────────────────────────────────
  'action_admin_only': {
    roles: ['admin'],
  },

  // ── OperationId whitelist ────────────────────────────────────────────────
  'action_pp_export': {
    operationIds: ['OP_EXPORT', 'OP_PREMIUM'],
  },

  // ── Role OR operationId ──────────────────────────────────────────────────
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],
  },

  // ── BOUNDARY: visible to all except blacklisted role, permanent ───────────
  // no flag can lift this — no removeExcludeRoles in any extendedAccess
  'action_no_courier_ever': {
    excludeRoles: ['courier'],
  },

  // ── BOUNDARY: visible to all except blacklisted operationId, permanent ───
  'action_no_readonly': {
    excludeOperationIds: ['OP_READONLY', 'OP_GUEST'],
  },

  // ── BOUNDARY: blacklisted role, flag lifts the ban ────────────────────────
  // must remove from blacklist AND add to whitelist — both required
  'action_pp_special': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
    ],
  },

  // ── BOUNDARY: blacklisted operationId, flag lifts the ban ────────────────
  'action_pp_unblockable': {
    excludeOperationIds: ['OP_READONLY'],
    extendedAccess: [
      {
        flag: 'unblockReadonly',
        removeExcludeOperationIds: ['OP_READONLY'],
        addOperationIds: ['OP_READONLY'],
      },
    ],
  },

  // ── BOUNDARY: open to all except courier, flag only removes ban ───────────
  // no whitelist — after blacklist cleared, everyone passes (no addRoles needed)
  'action_open_except_courier': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'removeBlockForCourier',
        removeExcludeRoles: ['courier'],
      },
    ],
  },

  // ── Whitelist + flag extends it ──────────────────────────────────────────
  'action_pp_priority': {
    operationIds: ['OP_PREMIUM'],
    extendedAccess: [
      {
        flag: 'extendedPriority',
        addOperationIds: ['OP_TEAM', 'OP_BUSINESS'],
      },
    ],
  },

  // ── Multiple flags, each patches independently ───────────────────────────
  'action_pp_advanced': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
      {
        flag: 'showForPartners',
        addOperationIds: ['OP_PARTNER'],
      },
      {
        flag: 'showForTeams',
        addRoles: ['manager'],
        addOperationIds: ['OP_TEAM'],
      },
    ],
  },

  // ── Blacklist + whitelist + flag patches both ─────────────────────────────
  'action_pp_partner': {
    roles: ['admin', 'manager'],
    excludeRoles: ['courier', 'guest'],
    extendedAccess: [
      {
        flag: 'partnerAccess',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
        addOperationIds: ['OP_PARTNER'],
      },
    ],
  },

  // ── Flag required, no base access ────────────────────────────────────────
  'action_xx_experimental': {
    roles: [],
    extendedAccess: [
      {
        flag: 'experimentalTasks',
        addRoles: ['admin', 'manager'],
      },
    ],
  },

  // ── Domain-specific — allowedIn: ['archive'] in master list ──────────────
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'restoreForCourier',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
    ],
  },
}

export const canSeeTaskType = (id: TaskTypeId, ctx: UserContext): boolean =>
  resolveAccess(TASK_TYPE_ACCESS, id, ctx)
