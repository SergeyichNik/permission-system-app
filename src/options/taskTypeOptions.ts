import { canSeeTaskType } from '../accessMatrix/resolveTaskTypeAccess'
import type { MasterOption } from '../utils/optionUtils'

interface TaskTypeMeta {
  icon: string
  color: string
}

export const TASK_TYPE_OPTIONS: MasterOption<TaskTypeMeta>[] = [
  { id: 'action_pp_basic',        label: 'Basic',        meta: { icon: '📋', color: 'gray'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_basic', ctx) },
  { id: 'action_pp_view',         label: 'View',         meta: { icon: '👁',  color: 'blue'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_view', ctx) },
  { id: 'action_pp_destroy',      label: 'Destroy',      meta: { icon: '🗑',  color: 'red'    }, policy: (_can, ctx) => canSeeTaskType('action_pp_destroy', ctx) },
  { id: 'action_pp_approve',      label: 'Approve',      meta: { icon: '✅',  color: 'green'  }, policy: (_can, ctx) => canSeeTaskType('action_pp_approve', ctx) },
  { id: 'action_pp_export',       label: 'Export',       meta: { icon: '📤',  color: 'teal'   }, policy: (_can, ctx) => canSeeTaskType('action_pp_export', ctx) },
  { id: 'action_pp_bulk',         label: 'Bulk',         meta: { icon: '📦',  color: 'orange' }, policy: (_can, ctx) => canSeeTaskType('action_pp_bulk', ctx) },
  { id: 'action_pp_internal',     label: 'Internal',     meta: { icon: '🔒',  color: 'purple' }, policy: (_can, ctx) => canSeeTaskType('action_pp_internal', ctx) },
  { id: 'action_pp_special',      label: 'Special',      meta: { icon: '⭐',  color: 'yellow' }, policy: (_can, ctx) => canSeeTaskType('action_pp_special', ctx) },
  { id: 'action_pp_advanced',     label: 'Advanced',     meta: { icon: '🚀',  color: 'indigo' }, policy: (_can, ctx) => canSeeTaskType('action_pp_advanced', ctx) },
  { id: 'action_xx_experimental', label: 'Experimental', meta: { icon: '🧪',  color: 'pink'   }, policy: (_can, ctx) => canSeeTaskType('action_xx_experimental', ctx) },
  { id: 'action_archive_restore', label: 'Restore',      meta: { icon: '♻️',  color: 'brown'  }, policy: (_can, ctx) => canSeeTaskType('action_archive_restore', ctx) },
]
