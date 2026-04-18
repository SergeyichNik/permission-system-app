import type { ReactNode } from 'react'
import type { Action } from '../permissions/types'

interface RouteConfig {
  path: string
  element: ReactNode
  action: Action
  redirectTo?: string
}

// Placeholder page components — replace with real pages
const DashboardPage = () => <div>Dashboard</div>
const OrdersPage = () => <div>Orders</div>
const ExportPage = () => <div>Export</div>
const AdminPage = () => <div>Admin</div>

export const ROUTE_CONFIG: RouteConfig[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    action: 'common:dashboard:view',
  },
  {
    path: '/orders',
    element: <OrdersPage />,
    action: 'orders:page:view',
    redirectTo: '/dashboard',
  },
  {
    path: '/export',
    element: <ExportPage />,
    action: 'export:page:view',
    redirectTo: '/dashboard',
  },
  {
    path: '/admin',
    element: <AdminPage />,
    action: 'admin:page:view',
    redirectTo: '/dashboard',
  },
]
