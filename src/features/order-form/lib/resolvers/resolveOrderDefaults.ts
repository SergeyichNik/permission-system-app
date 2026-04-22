import { resolveOrderOptions } from './resolveOrderOptions'

type OrderOptions = ReturnType<typeof resolveOrderOptions>

export function resolveOrderDefaults(options: OrderOptions) {
  return {
    taskType: options.taskTypes[0]?.id ?? null,
    priority:
      options.priorities.find((o) => o.id === 'normal')?.id ??
      options.priorities[0]?.id ??
      null,
  }
}
