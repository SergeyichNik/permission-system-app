import { resolveSelectOptions } from '../../../utils/optionUtils'
import type { OptionTransform } from '../../../utils/optionUtils'
import { TASK_TYPE_OPTIONS } from '../../../options/taskTypeOptions'
import { PRIORITY_OPTIONS } from '../../../options/priorityOptions'

const taskTypeTransform: OptionTransform = {
  allowedValues: ['bug', 'task', 'feature'],
  modify: {
    bug: (opt, can) => ({
      ...opt,
      label: 'Bug Report',
      disabled: !can('orders:task:create_feature'),
      disabledReason: 'No permission to create bug tasks',
    }),
  },
}

export function resolveOrderOptions(can: (action: string) => boolean) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, taskTypeTransform),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can),
  }
}
