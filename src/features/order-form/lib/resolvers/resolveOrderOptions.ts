import { resolveSelectOptions } from '../../../../shared/lib/select-options'
import type {
  CanFn,
  UserContext,
} from '../../../../shared/lib/access-policy'
import { TASK_TYPE_OPTIONS } from '../../../../entities/task-type'
import { PRIORITY_OPTIONS } from '../../../../entities/priority'

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
