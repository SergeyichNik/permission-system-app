import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTE_CONFIG } from './routeConfig'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {ROUTE_CONFIG.map(({ path, element, action, redirectTo }) => (
        <Route
          key={path}
          element={<ProtectedRoute action={action} redirectTo={redirectTo} />}
        >
          <Route path={path} element={element} />
        </Route>
      ))}
    </Routes>
  )
}
