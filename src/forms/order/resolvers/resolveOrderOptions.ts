import { resolveSelectOptions } from '../../../utils/optionUtils'
import type { CanFn, UserContext } from '../../../permissions/types'
import { TASK_TYPE_OPTIONS } from '../../../options/taskTypeOptions'
import { PRIORITY_OPTIONS } from '../../../options/priorityOptions'

export type OrderFormDomain = 'my' | 'common' | 'archive'

export function resolveOrderOptions(
  can: CanFn,
  ctx: UserContext,
  domain: OrderFormDomain
) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, ctx, undefined, domain),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can, ctx),
  }
}
