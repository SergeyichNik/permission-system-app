import type { MasterOption } from '../../../shared/lib/select-options'

export const ORDER_TABS_CONFIG: MasterOption[] = [
  {
    id: 'list',
    label: 'All Orders',
    policy: () => true,
  },
  {
    id: 'pending',
    label: 'Pending',
    policy: (can) => can('orders:tab:pending'),
  },
  {
    id: 'export',
    label: 'Export',
    policy: (can) => can('orders:tab:export'),
  },
]
