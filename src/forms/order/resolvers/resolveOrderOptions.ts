import { resolveSelectOptions } from '../../../utils/optionUtils'
import type { OptionTransform } from '../../../utils/optionUtils'
import type { UserContext } from '../../../permissions/types'
import { TASK_TYPE_OPTIONS } from '../../../options/taskTypeOptions'
import { PRIORITY_OPTIONS } from '../../../options/priorityOptions'

const taskTypeTransform: OptionTransform = {
  allowedValues: ['action_basic_view', 'action_admin_only', 'action_pp_export'],
}

export function resolveOrderOptions(can: (action: string) => boolean, ctx: UserContext) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, ctx, taskTypeTransform),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can, ctx),
  }
}
