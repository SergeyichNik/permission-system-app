import type { MasterOption } from '../../../shared/lib/select-options'

export const PRIORITY_OPTIONS: MasterOption[] = [
  {
    id: 'normal',
    label: 'Normal',
    policy: () => true,
  },
  {
    id: 'high',
    label: 'High Priority',
    policy: (can) => can('orders:priority:high'),
  },
  {
    id: 'critical',
    label: 'Critical',
    policy: (can) => can('orders:priority:critical'),
  },
]