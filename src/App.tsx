import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { usePermissionsStore } from './store/permissionsStore'
import { AppRoutes } from './routes/AppRoutes'

interface TopLevelProps {
  roles: string[]
  operationIds: string[]
  featureFlags: Record<string, boolean>
}

function AppInner({ roles, operationIds, featureFlags }: TopLevelProps) {
  const setPermissions = usePermissionsStore((s) => s.setPermissions)

  useEffect(() => {
    setPermissions({ roles, operationIds, featureFlags })
  }, [roles, operationIds, featureFlags, setPermissions])

  return <AppRoutes />
}

export function App(props: TopLevelProps) {
  return (
    <BrowserRouter>
      <AppInner {...props} />
    </BrowserRouter>
  )
}

export default App
