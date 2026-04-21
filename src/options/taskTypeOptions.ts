import { canSeeTaskType, type TaskTypeId } from '../accessMatrix/taskTypeAccess'
import type { MasterOption } from '../utils/optionUtils'

interface TaskTypeMeta {
  icon: string
  color: string
}

export const TASK_TYPE_OPTIONS: MasterOption<TaskTypeMeta>[] = [
  { id: 'action_basic_view'           satisfies TaskTypeId, label: 'View',            allowedIn: ['my', 'common', 'archive'], meta: { icon: '👁',  color: 'blue'   }, policy: (_can, ctx) => canSeeTaskType('action_basic_view', ctx) },
  { id: 'action_nobody'               satisfies TaskTypeId, label: 'Nobody',           allowedIn: ['my'],                      meta: { icon: '🚷',  color: 'black'  }, policy: (_can, ctx) => canSeeTaskType('action_nobody', ctx) },
  { id: 'action_hidden_by_default'    satisfies TaskTypeId, label: 'Premium Action',   allowedIn: ['my', 'common'],            meta: { icon: '💎',  color: 'gold'   }, policy: (_can, ctx) => canSeeTaskType('action_hidden_by_default', ctx) },
  { id: 'action_hidden_opens_for_roles' satisfies TaskTypeId, label: 'Beta',           allowedIn: ['my'],                      meta: { icon: '🧪',  color: 'violet' }, policy: (_can, ctx) => canSeeTaskType('action_hidden_opens_for_roles', ctx) },
  { id: 'action_admin_only'           satisfies TaskTypeId, label: 'Admin',            allowedIn: ['my', 'common'],            meta: { icon: '🔐',  color: 'red'    }, policy: (_can, ctx) => canSeeTaskType('action_admin_only', ctx) },
  { id: 'action_pp_export'            satisfies TaskTypeId, label: 'Export',           allowedIn: ['my', 'common'],            meta: { icon: '📤',  color: 'teal'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_export', ctx) },
  { id: 'action_pp_bulk'              satisfies TaskTypeId, label: 'Bulk',             allowedIn: ['my', 'common'],            meta: { icon: '📦',  color: 'orange' }, policy: (_can, ctx) => canSeeTaskType('action_pp_bulk', ctx) },
  { id: 'action_no_courier_ever'      satisfies TaskTypeId, label: 'Internal',         allowedIn: ['my', 'common'],            meta: { icon: '🔒',  color: 'purple' }, policy: (_can, ctx) => canSeeTaskType('action_no_courier_ever', ctx) },
  { id: 'action_no_readonly'          satisfies TaskTypeId, label: 'Restricted',       allowedIn: ['my', 'common'],            meta: { icon: '🚫',  color: 'gray'   }, policy: (_can, ctx) => canSeeTaskType('action_no_readonly', ctx) },
  { id: 'action_pp_special'           satisfies TaskTypeId, label: 'Special',          allowedIn: ['my', 'common'],            meta: { icon: '⭐',  color: 'yellow' }, policy: (_can, ctx) => canSeeTaskType('action_pp_special', ctx) },
  { id: 'action_pp_unblockable'       satisfies TaskTypeId, label: 'Unblockable',      allowedIn: ['my', 'common'],            meta: { icon: '🔓',  color: 'cyan'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_unblockable', ctx) },
  { id: 'action_open_except_courier'  satisfies TaskTypeId, label: 'No Courier',       allowedIn: ['my', 'common'],            meta: { icon: '🚚',  color: 'brown'  }, policy: (_can, ctx) => canSeeTaskType('action_open_except_courier', ctx) },
  { id: 'action_pp_priority'          satisfies TaskTypeId, label: 'Priority',         allowedIn: ['my', 'common'],            meta: { icon: '🎯',  color: 'pink'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_priority', ctx) },
  { id: 'action_pp_advanced'          satisfies TaskTypeId, label: 'Advanced',         allowedIn: ['my', 'common'],            meta: { icon: '🚀',  color: 'indigo' }, policy: (_can, ctx) => canSeeTaskType('action_pp_advanced', ctx) },
  { id: 'action_pp_partner'           satisfies TaskTypeId, label: 'Partner',          allowedIn: ['my', 'common'],            meta: { icon: '🤝',  color: 'green'  }, policy: (_can, ctx) => canSeeTaskType('action_pp_partner', ctx) },
  { id: 'action_xx_experimental'      satisfies TaskTypeId, label: 'Experimental',     allowedIn: ['my'],                      meta: { icon: '⚗️',  color: 'lime'   }, policy: (_can, ctx) => canSeeTaskType('action_xx_experimental', ctx) },
  { id: 'action_archive_restore'      satisfies TaskTypeId, label: 'Restore',          allowedIn: ['archive'],                 meta: { icon: '♻️',  color: 'slate'  }, policy: (_can, ctx) => canSeeTaskType('action_archive_restore', ctx) },
]
