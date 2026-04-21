import { canSeeTaskType } from '../accessMatrix/resolveTaskTypeAccess'
import type { MasterOption } from '../utils/optionUtils'

interface TaskTypeMeta {
  icon: string
  color: string
}

export const TASK_TYPE_OPTIONS: MasterOption<TaskTypeMeta>[] = [
  { id: 'action_basic_view',      label: 'View',         allowedIn: ['my', 'common', 'archive'], meta: { icon: '👁',  color: 'blue'   }, policy: (_can, ctx) => canSeeTaskType('action_basic_view', ctx) },
  { id: 'action_admin_only',      label: 'Admin',        allowedIn: ['my', 'common'],            meta: { icon: '🔐',  color: 'red'    }, policy: (_can, ctx) => canSeeTaskType('action_admin_only', ctx) },
  { id: 'action_pp_export',       label: 'Export',       allowedIn: ['my', 'common'],            meta: { icon: '📤',  color: 'teal'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_export', ctx) },
  { id: 'action_pp_bulk',         label: 'Bulk',         allowedIn: ['my', 'common'],            meta: { icon: '📦',  color: 'orange' }, policy: (_can, ctx) => canSeeTaskType('action_pp_bulk', ctx) },
  { id: 'action_no_courier_ever', label: 'Internal',     allowedIn: ['my', 'common'],            meta: { icon: '🔒',  color: 'purple' }, policy: (_can, ctx) => canSeeTaskType('action_no_courier_ever', ctx) },
  { id: 'action_no_readonly',     label: 'Restricted',   allowedIn: ['my', 'common'],            meta: { icon: '🚫',  color: 'gray'   }, policy: (_can, ctx) => canSeeTaskType('action_no_readonly', ctx) },
  { id: 'action_pp_special',      label: 'Special',      allowedIn: ['my', 'common'],            meta: { icon: '⭐',  color: 'yellow' }, policy: (_can, ctx) => canSeeTaskType('action_pp_special', ctx) },
  { id: 'action_pp_unblockable',  label: 'Unblockable',  allowedIn: ['my', 'common'],            meta: { icon: '🔓',  color: 'cyan'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_unblockable', ctx) },
  { id: 'action_pp_partner',      label: 'Partner',      allowedIn: ['my', 'common'],            meta: { icon: '🤝',  color: 'green'  }, policy: (_can, ctx) => canSeeTaskType('action_pp_partner', ctx) },
  { id: 'action_pp_extendable',   label: 'Extendable',   allowedIn: ['my', 'common'],            meta: { icon: '➕',  color: 'lime'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_extendable', ctx) },
  { id: 'action_pp_priority',     label: 'Priority',     allowedIn: ['my', 'common'],            meta: { icon: '🎯',  color: 'pink'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_priority', ctx) },
  { id: 'action_pp_advanced',     label: 'Advanced',     allowedIn: ['my', 'common'],            meta: { icon: '🚀',  color: 'indigo' }, policy: (_can, ctx) => canSeeTaskType('action_pp_advanced', ctx) },
  { id: 'action_xx_experimental', label: 'Experimental', allowedIn: ['my'],                      meta: { icon: '🧪',  color: 'violet' }, policy: (_can, ctx) => canSeeTaskType('action_xx_experimental', ctx) },
  { id: 'action_archive_restore', label: 'Restore',      allowedIn: ['archive'],                 meta: { icon: '♻️',  color: 'brown'  }, policy: (_can, ctx) => canSeeTaskType('action_archive_restore', ctx) },
]
