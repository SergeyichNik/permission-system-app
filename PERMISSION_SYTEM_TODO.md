# Permission System — Implementation TODO for Claude Code

## Context

Build a permission system for a React application that controls access to routes, tabs, select options, form configs, and UI components based on three orthogonal attributes:

- **roles** — `Set<string>` (e.g. `'admin'`, `'manager'`, `'viewer'`)
- **operationIds** — `Set<string>` (e.g. `'OP_EXPORT'`, `'OP_PREMIUM'`)
- **featureFlags** — `Map<string, boolean>` (e.g. `'experimental_options' => true`)

All three attributes arrive as **props at the top level** of the app and are stored in a **Zustand store**. The permission system reads exclusively from this store — no component accesses attributes directly.

---

## Architecture Overview

```
Props (top level)
  └── Zustand store { roles, operationIds, featureFlags }
        └── usePermissions() → can(action: Action): boolean
              └── resolvePermission(action, ctx) → policies[action](ctx)
                    └── policies[action] = (ctx) => base.someCapability(ctx)
                          └── base.someCapability checks roles + operationIds + featureFlags
```

Components, route configs, tab configs, and select option configs **only call `can('domain:resource:action')`**. They never read roles, operationIds, or featureFlags directly.

---

## File Structure to Create

```
src/
  permissions/
    types.ts
    base.ts
    resolver.ts
    usePermissions.ts
    policies/
      index.ts
      ordersPolicies.ts       ← example domain, adapt to real domains
      exportPolicies.ts
      adminPolicies.ts
  store/
    permissionsStore.ts
  options/
    taskTypeOptions.ts        ← example master list
    priorityOptions.ts
  utils/
    optionUtils.ts
  routes/
    routeConfig.tsx
    ProtectedRoute.tsx
    AppRoutes.tsx
  components/
    Can.tsx
  forms/
    order/                    ← example form, replicate pattern for each form
      useOrderFormConfig.ts
      resolvers/
        resolveOrderOptions.ts
        resolveOrderDefaults.ts
        resolveOrderSchemas.ts
```

---

## Step 1 — Zustand Store

```ts
// src/store/permissionsStore.ts

import { create } from 'zustand'

interface PermissionsState {
  roles: Set<string>
  operationIds: Set<string>
  featureFlags: Map<string, boolean>
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
  setPermissions: ({ roles, operationIds, featureFlags }) =>
    set({
      roles: new Set(roles),
      operationIds: new Set(operationIds),
      featureFlags: new Map(Object.entries(featureFlags)),
    }),
}))
```

Initialize at the top level of the app where props arrive:

```tsx
// src/App.tsx (or wherever top-level props are received)

function App({ roles, operationIds, featureFlags }: TopLevelProps) {
  const setPermissions = usePermissionsStore((s) => s.setPermissions)

  useEffect(() => {
    setPermissions({ roles, operationIds, featureFlags })
  }, [roles, operationIds, featureFlags])

  return <AppRoutes />
}
```

---

## Step 2 — Types

```ts
// src/permissions/types.ts

export interface UserContext {
  roles: Set<string>
  operationIds: Set<string>
  featureFlags: Map<string, boolean>
}

export type PolicyFn = (ctx: UserContext) => boolean

// Add every action string used across the app here.
// TypeScript will error if can() is called with an unknown action.
export type Action =
  // orders domain
  | 'orders:page:view'
  | 'orders:tab:pending'
  | 'orders:tab:export'
  | 'orders:task:create_feature'
  | 'orders:task:experimental'
  | 'orders:priority:high'
  | 'orders:priority:critical'
  // export domain
  | 'export:page:view'
  | 'export:tab:view'
  | 'export:data:parquet'
  // admin domain
  | 'admin:page:view'
  // common
  | 'common:experimental:access'
  // ADD MORE as needed — TypeScript will enforce exhaustiveness
```

---

## Step 3 — Base Capabilities

Base contains **all real logic**. Policies only reference base — never duplicate logic.

```ts
// src/permissions/base.ts

import { UserContext } from './types'

export const base = {
  // ── Role checks ──────────────────────────────────────────────
  isAdmin: (ctx: UserContext) =>
    ctx.roles.has('admin'),

  isManager: (ctx: UserContext) =>
    ctx.roles.has('admin') || ctx.roles.has('manager'),

  isViewer: (ctx: UserContext) =>
    ctx.roles.has('viewer'),

  // ── OperationId extends role ─────────────────────────────────
  canManageOrders: (ctx: UserContext) =>
    base.isManager(ctx) || ctx.operationIds.has('OP_ORDERS'),

  canExport: (ctx: UserContext) =>
    base.isAdmin(ctx) || ctx.operationIds.has('OP_EXPORT'),

  // ── Feature flag checks ──────────────────────────────────────
  experimentalEnabled: (ctx: UserContext) =>
    ctx.featureFlags.get('experimental_options') === true,

  extendedPriorityEnabled: (ctx: UserContext) =>
    ctx.featureFlags.get('extended_priority') === true,

  // ── Combinations: flag + operationId ─────────────────────────
  // Example: option was always available for OP_PREMIUM and OP_ENTERPRISE.
  // After flag 'extended_priority' is enabled, OP_TEAM and OP_BUSINESS are added.
  canUsePriorityHigh: (ctx: UserContext) => {
    const baseAccess =
      ctx.operationIds.has('OP_PREMIUM') ||
      ctx.operationIds.has('OP_ENTERPRISE')

    const extendedAccess =
      base.extendedPriorityEnabled(ctx) &&
      (ctx.operationIds.has('OP_TEAM') ||
       ctx.operationIds.has('OP_BUSINESS'))

    return baseAccess || extendedAccess
  },

  // ── Combination: flag + role + operationId ───────────────────
  canSeeExperimental: (ctx: UserContext) =>
    base.experimentalEnabled(ctx) &&
    (base.isAdmin(ctx) || ctx.operationIds.has('OP_EXPERIMENTAL')),
}
```

**Rule**: if you find logic in `policies/`, move it to `base`. Policies are always one-liners.

---

## Step 4 — Policies

```ts
// src/permissions/policies/ordersPolicies.ts
import { base } from '../base'
import { PolicyFn, Action } from '../types'

export const ordersPolicies: Partial<Record<Action, PolicyFn>> = {
  'orders:page:view':           (ctx) => base.canManageOrders(ctx),
  'orders:tab:pending':         (ctx) => base.canManageOrders(ctx),
  'orders:tab:export':          (ctx) => base.canExport(ctx),
  'orders:task:create_feature': (ctx) => base.canManageOrders(ctx),
  'orders:task:experimental':   (ctx) => base.canSeeExperimental(ctx),
  'orders:priority:high':       (ctx) => base.canUsePriorityHigh(ctx),
  'orders:priority:critical':   (ctx) => base.isAdmin(ctx),
}

// src/permissions/policies/exportPolicies.ts
export const exportPolicies: Partial<Record<Action, PolicyFn>> = {
  'export:page:view':    (ctx) => base.canExport(ctx),
  'export:tab:view':     (ctx) => base.canExport(ctx),
  'export:data:parquet': (ctx) => base.canSeeExperimental(ctx),
}

// src/permissions/policies/adminPolicies.ts
export const adminPolicies: Partial<Record<Action, PolicyFn>> = {
  'admin:page:view': (ctx) => base.isAdmin(ctx),
}

// src/permissions/policies/index.ts
import { Record } from '../types'
import { ordersPolicies } from './ordersPolicies'
import { exportPolicies } from './exportPolicies'
import { adminPolicies } from './adminPolicies'

export const policies: Record<Action, PolicyFn> = {
  ...ordersPolicies,
  ...exportPolicies,
  ...adminPolicies,
}
```

---

## Step 5 — Resolver and Hook

```ts
// src/permissions/resolver.ts
import { policies } from './policies'
import { Action, UserContext } from './types'

export function resolvePermission(action: Action, ctx: UserContext): boolean {
  const policy = policies[action]
  if (!policy) return false  // deny by default
  return policy(ctx)
}
```

```ts
// src/permissions/usePermissions.ts
import { useCallback } from 'react'
import { usePermissionsStore } from '../store/permissionsStore'
import { resolvePermission } from './resolver'
import { Action, UserContext } from './types'

export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()

  const can = useCallback(
    (action: Action): boolean => {
      const ctx: UserContext = { roles, operationIds, featureFlags }
      return resolvePermission(action, ctx)
    },
    [roles, operationIds, featureFlags]
  )

  return { can }
}
```

---

## Step 6 — Can Component (declarative JSX)

```tsx
// src/components/Can.tsx
import { ReactNode } from 'react'
import { usePermissions } from '../permissions/usePermissions'
import { Action } from '../permissions/types'

interface CanProps {
  action: Action
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ action, children, fallback = null }: CanProps) {
  const { can } = usePermissions()
  return can(action) ? <>{children}</> : <>{fallback}</>
}
```

Usage:

```tsx
<Can action="orders:page:view">
  <OrdersButton />
</Can>

<Can action="admin:page:view" fallback={<DisabledButton />}>
  <AdminPanel />
</Can>
```

---

## Step 7 — Option Utils

```ts
// src/utils/optionUtils.ts

export interface MasterOption<TMeta = unknown> {
  id: string
  label: string
  meta?: TMeta
  policy: (can: (action: string) => boolean) => boolean
}

export interface ResolvedOption<TMeta = unknown> {
  id: string
  label: string
  meta?: TMeta
  disabled?: boolean
  disabledReason?: string
}

export interface OptionTransform<TMeta = unknown> {
  allowedValues?: string[]
  modify?: {
    [id: string]: (
      option: ResolvedOption<TMeta>,
      can: (action: string) => boolean
    ) => ResolvedOption<TMeta>
  }
}

export function resolveSelectOptions<TMeta>(
  masterList: MasterOption<TMeta>[],
  can: (action: string) => boolean,
  transform?: OptionTransform<TMeta>
): ResolvedOption<TMeta>[] {
  return masterList
    // Step 1: global policy
    .filter((opt) => opt.policy(can))
    // Step 2: form-specific allowedValues
    .filter((opt) =>
      !transform?.allowedValues ||
      transform.allowedValues.includes(opt.id)
    )
    // Step 3: strip policy, produce ResolvedOption
    .map(({ policy, ...opt }) => opt as ResolvedOption<TMeta>)
    // Step 4: form-specific modifications
    .map((opt) => transform?.modify?.[opt.id]?.(opt, can) ?? opt)
}

// Extract all values — used as validList for schemaFabric
export function extractValues(options: ResolvedOption[]): string[] {
  return options.map((opt) => opt.id)
}

// Extract only non-disabled values — use when disabled options are not valid form values
export function extractActiveValues(options: ResolvedOption[]): string[] {
  return options.filter((opt) => !opt.disabled).map((opt) => opt.id)
}
```

---

## Step 8 — Master Option Lists (examples)

```ts
// src/options/taskTypeOptions.ts
import { MasterOption } from '../utils/optionUtils'

interface TaskTypeMeta {
  icon: string
  color: string
}

export const TASK_TYPE_OPTIONS: MasterOption<TaskTypeMeta>[] = [
  {
    id: 'bug',
    label: 'Bug',
    meta: { icon: '🐛', color: 'red' },
    policy: () => true,
  },
  {
    id: 'task',
    label: 'Task',
    meta: { icon: '✅', color: 'blue' },
    policy: () => true,
  },
  {
    id: 'feature',
    label: 'Feature',
    meta: { icon: '⭐', color: 'green' },
    policy: (can) => can('orders:task:create_feature'),
  },
  {
    id: 'experimental',
    label: 'Experiment',
    meta: { icon: '🧪', color: 'purple' },
    policy: (can) => can('orders:task:experimental'),
  },
]

// src/options/priorityOptions.ts
export const PRIORITY_OPTIONS: MasterOption[] = [
  {
    id: 'normal',
    label: 'Normal',
    policy: () => true,
  },
  {
    id: 'high',
    label: 'High Priority',
    // Always available for OP_PREMIUM/OP_ENTERPRISE.
    // After 'extended_priority' flag: also available for OP_TEAM/OP_BUSINESS.
    policy: (can) => can('orders:priority:high'),
  },
  {
    id: 'critical',
    label: 'Critical',
    policy: (can) => can('orders:priority:critical'),
  },
]
```

---

## Step 9 — Form Config Pipeline (example: Order form)

```ts
// src/forms/order/resolvers/resolveOrderOptions.ts
import { resolveSelectOptions, OptionTransform } from '../../../utils/optionUtils'
import { TASK_TYPE_OPTIONS } from '../../../options/taskTypeOptions'
import { PRIORITY_OPTIONS } from '../../../options/priorityOptions'

const taskTypeTransform: OptionTransform = {
  allowedValues: ['bug', 'task', 'feature'], // 'experimental' not needed on this form
  modify: {
    bug: (opt, can) => ({
      ...opt,
      label: 'Bug Report',                  // override label for this form
      disabled: !can('orders:task:create_feature'),
      disabledReason: 'No permission to create bug tasks',
    }),
  },
}

export function resolveOrderOptions(can: (action: string) => boolean) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, taskTypeTransform),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can),
  }
}
```

```ts
// src/forms/order/resolvers/resolveOrderDefaults.ts
import { resolveOrderOptions } from './resolveOrderOptions'

type OrderOptions = ReturnType<typeof resolveOrderOptions>

export function resolveOrderDefaults(
  options: OrderOptions,
  can: (action: string) => boolean
) {
  return {
    // always pick first available — never out of sync with options
    taskType: options.taskTypes[0]?.id ?? null,

    // prefer 'normal' if available, otherwise first available
    priority:
      options.priorities.find((o) => o.id === 'normal')?.id ??
      options.priorities[0]?.id ??
      null,
  }
}
```

```ts
// src/forms/order/resolvers/resolveOrderSchemas.ts
// Uses your existing schemaFabric pattern — validList always derived from options
import { extractValues, extractActiveValues } from '../../../utils/optionUtils'
import { resolveOrderOptions } from './resolveOrderOptions'
import { resolveOrderDefaults } from './resolveOrderDefaults'

type OrderOptions = ReturnType<typeof resolveOrderOptions>
type OrderDefaults = ReturnType<typeof resolveOrderDefaults>

export function resolveOrderSchemas(options: OrderOptions, defaults: OrderDefaults) {
  // validList derived from options — single source of truth, never diverges
  const taskTypeValues = extractValues(options.taskTypes)
  const priorityValues = extractActiveValues(options.priorities)

  return {
    validation: yup.object({
      taskType: taskTypeSchemaFabric(false, taskTypeValues),
      priority: prioritySchemaFabric(false, priorityValues),
    }),
    hydration: yup.object({
      // fallback always comes from defaults — which are already derived from options
      taskType: taskTypeSchemaFabric(true, taskTypeValues, defaults.taskType),
      priority: prioritySchemaFabric(true, priorityValues, defaults.priority),
    }),
  }
}
```

```ts
// src/forms/order/useOrderFormConfig.ts
import { useMemo } from 'react'
import { usePermissions } from '../../permissions/usePermissions'
import { resolveOrderOptions } from './resolvers/resolveOrderOptions'
import { resolveOrderDefaults } from './resolvers/resolveOrderDefaults'
import { resolveOrderSchemas } from './resolvers/resolveOrderSchemas'

export function useOrderFormConfig() {
  const { can } = usePermissions()

  return useMemo(() => {
    // explicit pipeline — dependencies read top to bottom
    const options  = resolveOrderOptions(can)
    const defaults = resolveOrderDefaults(options, can)
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
  }, [can])
}
```

Usage on a form page:

```tsx
function OrderFormPage() {
  const { validationSchema, hydrationSchema, defaultValues, formComponentsProps } =
    useOrderFormConfig()

  const form = useForm({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  const { onSubmit, formData } = usePersistedForm({
    form,
    blacklist: ['some-field'],
    hydrationSchemeHandler: (value) => hydrationSchema.cast(value),
  })

  return (
    <form onSubmit={onSubmit}>
      <TaskTypeSelect options={formComponentsProps.taskType.options} />
      <PrioritySelect options={formComponentsProps.priority.options} />
    </form>
  )
}
```

---

## Step 10 — Routes

```tsx
// src/routes/routeConfig.tsx
import { Action } from '../permissions/types'

interface RouteConfig {
  path: string
  element: ReactNode
  action: Action           // which action gates this route
  redirectTo?: string      // where to redirect if denied
}

export const ROUTE_CONFIG: RouteConfig[] = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    action: 'common:experimental:access', // use a permissive action or create 'common:dashboard:view'
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
```

```tsx
// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../permissions/usePermissions'
import { Action } from '../permissions/types'

export function ProtectedRoute({
  action,
  redirectTo = '/dashboard',
}: {
  action: Action
  redirectTo?: string
}) {
  const { can } = usePermissions()
  return can(action) ? <Outlet /> : <Navigate to={redirectTo} replace />
}
```

```tsx
// src/routes/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom'
import { ROUTE_CONFIG } from './routeConfig'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
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
```

---

## Step 11 — Tabs

Tabs use the same `resolveSelectOptions` as select options. Fallback is a redirect to first available tab.

```ts
// src/tabs/orderTabsConfig.ts
import { MasterOption } from '../utils/optionUtils'
import { Action } from '../permissions/types'

interface TabMeta {
  action: Action
}

export const ORDER_TABS_CONFIG: MasterOption<TabMeta>[] = [
  {
    id: 'list',
    label: 'All Orders',
    policy: () => true,
  },
  {
    id: 'pending',
    label: 'Pending',
    policy: (can) => can('orders:tab:pending'),
  },
  {
    id: 'export',
    label: 'Export',
    policy: (can) => can('orders:tab:export'),
  },
]
```

```tsx
// usage in component
function OrderTabs() {
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState<string | null>(null)

  const tabs = useMemo(
    () => resolveSelectOptions(ORDER_TABS_CONFIG, can),
    [can]
  )

  // set initial tab or redirect if current tab becomes unavailable
  useEffect(() => {
    const firstAvailable = tabs[0]?.id ?? null
    if (!activeTab || !tabs.find((t) => t.id === activeTab)) {
      setActiveTab(firstAvailable)
    }
  }, [tabs])

  if (!tabs.length) return <NoAccessScreen />

  return <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
}
```

---

## Key Rules — Enforce These

| Rule | Why |
|---|---|
| Components never read `roles`, `operationIds`, `featureFlags` directly | Single source of truth |
| Logic only in `base.ts`, policies are always one-liners | No duplication |
| `validList` for schemaFabric always derived from `resolveSelectOptions` result | Schema and options never diverge |
| `resolveDefaults` always receives resolved `options` as argument | Defaults never reference unavailable values |
| New action → add to `Action` type first | TypeScript enforces completeness |
| Deny by default in resolver | Safe baseline |

---

## Adding New Things — Cheatsheet

**New operationId extends existing capability**
→ one line in `base.ts`

**New option in a select**
→ one entry in master list + one action in `types.ts` + one line in domain policies

**New select on existing form**
→ master list + entry in `resolveFormOptions` + entry in `resolveFormSchemas`

**New route**
→ one entry in `ROUTE_CONFIG` + action must exist in `types.ts`

**New form**
→ create `forms/newForm/` folder with `useNewFormConfig.ts` + resolvers, follow order form pattern exactly
