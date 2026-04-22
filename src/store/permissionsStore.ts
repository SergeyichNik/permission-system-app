import { create } from 'zustand'

interface PermissionsState {
  roles: Set<string>
  operationIds: Set<string>
  featureFlags: Map<string, boolean>
  initialized: boolean
  setPermissions: (attrs: {
    roles: string[]
    operationIds: string[]
    featureFlags: Record<string, boolean>
  }) => void
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  roles: new Set(),
  operationIds: new Set(),
  featureFlags: new Map(),
  initialized: false,
  setPermissions: ({ roles, operationIds, featureFlags }) =>
    set({
      roles: new Set(roles),
      operationIds: new Set(operationIds),
      featureFlags: new Map(Object.entries(featureFlags)),
      initialized: true,
    }),
}))
