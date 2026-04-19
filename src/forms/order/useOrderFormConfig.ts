import { useMemo } from 'react'
import { usePermissions } from '../../permissions/usePermissions'
import { resolveOrderOptions } from './resolvers/resolveOrderOptions'
import { resolveOrderDefaults } from './resolvers/resolveOrderDefaults'
import { resolveOrderSchemas } from './resolvers/resolveOrderSchemas'

export function useOrderFormConfig() {
  const { can, ctx } = usePermissions()

  return useMemo(() => {
    const options  = resolveOrderOptions(can, ctx)
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
  }, [can, ctx])
}
