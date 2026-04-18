import * as yup from 'yup'
import { extractValues, extractActiveValues } from '../../../utils/optionUtils'
import { resolveOrderOptions } from './resolveOrderOptions'
import { resolveOrderDefaults } from './resolveOrderDefaults'

type OrderOptions = ReturnType<typeof resolveOrderOptions>
type OrderDefaults = ReturnType<typeof resolveOrderDefaults>

export function resolveOrderSchemas(options: OrderOptions, defaults: OrderDefaults) {
  const taskTypeValues = extractValues(options.taskTypes)
  const priorityValues = extractActiveValues(options.priorities)

  return {
    validation: yup.object({
      taskType: yup.string().oneOf(taskTypeValues).required(),
      priority: yup.string().oneOf(priorityValues).required(),
    }),
    hydration: yup.object({
      taskType: yup
        .string()
        .oneOf(taskTypeValues)
        .default(defaults.taskType ?? taskTypeValues[0]),
      priority: yup
        .string()
        .oneOf(priorityValues)
        .default(defaults.priority ?? priorityValues[0]),
    }),
  }
}
