import type { TaskTypeAccess } from './types'

export const TASK_TYPE_ACCESS: Record<string, TaskTypeAccess> = {

  // ── Visible to everyone ──────────────────────────────────────────────────
  'action_basic_view': {},

  // ── Role whitelist only ──────────────────────────────────────────────────
  'action_admin_only': {
    roles: ['admin'],
  },

  // ── OperationId only ─────────────────────────────────────────────────────
  'action_pp_export': {
    operationIds: ['OP_EXPORT', 'OP_PREMIUM'],
  },

  // ── Role OR operationId ──────────────────────────────────────────────────
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],
  },

  // ── Blacklist role, hard — flag cannot lift this ─────────────────────────
  'action_no_courier_ever': {
    excludeRoles: ['courier'],
  },

  // ── Blacklist operationId, hard ──────────────────────────────────────────
  'action_no_readonly': {
    excludeOperationIds: ['OP_READONLY', 'OP_GUEST'],
  },

  // ── Blacklist role, soft — flag CAN lift the ban ─────────────────────────
  'action_pp_special': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
        overrideExcludes: true,
      },
    ],
  },

  // ── Blacklist operationId, soft — flag lifts the ban ─────────────────────
  'action_pp_unblockable': {
    excludeOperationIds: ['OP_READONLY'],
    extendedAccess: [
      {
        flag: 'unblockReadonly',
        operationIds: ['OP_READONLY'],
        overrideExcludes: true,
      },
    ],
  },

  // ── Blacklist role + flag lifts for role AND operationId ─────────────────
  'action_pp_partner': {
    excludeRoles: ['courier', 'guest'],
    extendedAccess: [
      {
        flag: 'partnerAccess',
        roles: ['courier'],
        operationIds: ['OP_PARTNER'],
        overrideExcludes: true,
      },
    ],
  },

  // ── Whitelist + flag adds more roles ─────────────────────────────────────
  'action_pp_extendable': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
      },
    ],
  },

  // ── Whitelist + flag adds operationId ────────────────────────────────────
  'action_pp_priority': {
    operationIds: ['OP_PREMIUM'],
    extendedAccess: [
      {
        flag: 'extendedPriority',
        operationIds: ['OP_TEAM', 'OP_BUSINESS'],
      },
    ],
  },

  // ── Multiple flags, each adds independently ──────────────────────────────
  'action_pp_advanced': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
      },
      {
        flag: 'showForPartners',
        operationIds: ['OP_PARTNER'],
      },
      {
        flag: 'showForTeams',
        roles: ['manager'],
        operationIds: ['OP_TEAM'],
      },
    ],
  },

  // ── Flag required, no base access ────────────────────────────────────────
  'action_xx_experimental': {
    extendedAccess: [
      {
        flag: 'experimentalTasks',
        roles: ['admin', 'manager'],
      },
    ],
  },

  // ── Blacklist + flag lifts + domain filtered via allowedIn ───────────────
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'restoreForCourier',
        roles: ['courier'],
        overrideExcludes: true,
      },
    ],
  },
}
