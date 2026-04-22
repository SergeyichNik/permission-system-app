import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTE_CONFIG } from './routeConfig'
import { ProtectedRoute } from '../../features/access-gate'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {ROUTE_CONFIG.map(({ path, element, action, redirectTo }) => {
        const redirectAction = redirectTo
          ? ROUTE_CONFIG.find((r) => r.path === redirectTo)?.action
          : undefined
        return (
          <Route
            key={path}
            element={
              <ProtectedRoute
                action={action}
                redirectTo={redirectTo}
                redirectAction={redirectAction}
              />
            }
          >
            <Route path={path} element={element} />
          </Route>
        )
      })}
    </Routes>
  )
}
