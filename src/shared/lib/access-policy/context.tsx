import { createContext } from 'react'
import type { PolicyFn } from './types'

export const PoliciesContext = createContext<Record<string, PolicyFn>>({})
