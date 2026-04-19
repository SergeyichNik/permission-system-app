import type { TaskTypeAccess } from './types'

export const TASK_TYPE_ACCESS: Record<string, TaskTypeAccess> = {

  // ── No restrictions — visible to everyone ───────────────────────────────
  'action_pp_basic': {},
  'action_pp_view':  {},

  // ── Role whitelist — only specific roles ────────────────────────────────
  'action_pp_destroy': {
    roles: ['admin'],
  },

  'action_pp_approve': {
    roles: ['admin', 'manager'],
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

  // ── Blacklist — everyone except courier ─────────────────────────────────
  'action_pp_internal': {
    excludeRoles: ['courier'],
  },

  // ── Base rule + flag extends access ─────────────────────────────────────
  'action_pp_special': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
      },
    ],
  },

  // ── Multiple flag extensions ─────────────────────────────────────────────
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
    ],
  },

  // ── Flag required for everyone ───────────────────────────────────────────
  'action_xx_experimental': {
    extendedAccess: [
      {
        flag: 'experimentalTasks',
        roles: ['admin', 'manager', 'courier'],
      },
    ],
  },

  // ── Domain-specific examples ─────────────────────────────────────────────
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
  },
}
