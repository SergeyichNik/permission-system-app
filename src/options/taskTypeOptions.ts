import type { MasterOption } from '../utils/optionUtils'

interface TaskTypeMeta {
  icon: string
  color: string
}

export const TASK_TYPE_OPTIONS: MasterOption<TaskTypeMeta>[] = [
  {
    id: 'bug',
    label: 'Bug',
    meta: { icon: '🐛', color: 'red' },
    policy: () => true,
  },
  {
    id: 'task',
    label: 'Task',
    meta: { icon: '✅', color: 'blue' },
    policy: () => true,
  },
  {
    id: 'feature',
    label: 'Feature',
    meta: { icon: '⭐', color: 'green' },
    policy: (can) => can('orders:task:create_feature'),
  },
  {
    id: 'experimental',
    label: 'Experiment',
    meta: { icon: '🧪', color: 'purple' },
    policy: (can) => can('orders:task:experimental'),
  },
]
