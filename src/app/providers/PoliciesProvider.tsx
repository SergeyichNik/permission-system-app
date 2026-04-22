import type { ReactNode } from 'react'
import { PoliciesContext } from '../../shared/lib/access-policy'
import { appPolicies } from '../model/policies'

export function PoliciesProvider({ children }: { children: ReactNode }) {
  return (
    <PoliciesContext.Provider value={appPolicies}>
      {children}
    </PoliciesContext.Provider>
  )
}
