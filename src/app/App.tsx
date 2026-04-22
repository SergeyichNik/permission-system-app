import { BrowserRouter } from 'react-router-dom'
import { PermissionsProvider } from './providers/PermissionsProvider'
import { PoliciesProvider } from './providers/PoliciesProvider'
import { AppRoutes } from './routing/AppRoutes'

interface TopLevelProps {
  roles: string[]
  operationIds: string[]
  featureFlags: Record<string, boolean>
}

export function App({ roles, operationIds, featureFlags }: TopLevelProps) {
  return (
    <BrowserRouter>
      <PoliciesProvider>
        <PermissionsProvider
          roles={roles}
          operationIds={operationIds}
          featureFlags={featureFlags}
        >
          <AppRoutes />
        </PermissionsProvider>
      </PoliciesProvider>
    </BrowserRouter>
  )
}

export default App
