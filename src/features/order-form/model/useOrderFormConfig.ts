import { useMemo } from 'react'
import { usePermissions } from '../../access-gate'
import {
  resolveOrderOptions,
  type OrderFormDomain,
} from '../lib/resolvers/resolveOrderOptions'
import { resolveOrderDefaults } from '../lib/resolvers/resolveOrderDefaults'
import { resolveOrderSchemas } from '../lib/resolvers/resolveOrderSchemas'

export function useOrderFormConfig(domain: OrderFormDomain = 'my') {
  const { can, ctx } = usePermissions()

  return useMemo(() => {
    const options  = resolveOrderOptions(can, ctx, domain)
    const defaults = resolveOrderDefaults(options)
    const schemas  = resolveOrderSchemas(options, defaults)

    return {
      validationSchema: schemas.validation,
      hydrationSchema:  schemas.hydration,
      defaultValues:    defaults,
      formComponentsProps: {
        taskType: { options: options.taskTypes },
        priority: { options: options.priorities },
      },
    }
  }, [can, ctx, domain])
}
