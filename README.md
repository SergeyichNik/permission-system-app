# Permission System

A declarative, layered access control system for React applications. Controls visibility of routes, tabs, select options, and UI components based on three orthogonal attributes: **roles**, **operationIds**, and **featureFlags**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [User Attributes](#user-attributes)
- [Part 1 — General Permission System](#part-1--general-permission-system)
  - [Bootstrapping](#bootstrapping)
  - [Checking Permissions in Components](#checking-permissions-in-components)
  - [Route Guards](#route-guards)
  - [Adding a New Action](#adding-a-new-action)
- [Part 2 — Access Matrix](#part-2--access-matrix)
  - [When to Use Which System](#when-to-use-which-system)
  - [Access Matrix Rules](#access-matrix-rules)
  - [Adding a New Task Type Option](#adding-a-new-task-type-option)
- [Select Options System](#select-options-system)
  - [MasterOption and Policy](#masteroption-and-policy)
  - [resolveSelectOptions](#resolveselectoptions)
  - [OptionTransform](#optiontransform)
  - [Domain Filtering](#domain-filtering)
- [File Structure](#file-structure)
- [Cheatsheet](#cheatsheet)

---

## Architecture Overview

```
App (roles, operationIds, featureFlags)
  │
  ▼
permissionsStore (Zustand)
  │
  └── usePermissions() → { can, ctx }
        │
        ├── can('action')          Part 1: general system
        │     └── resolvePermission → policies[action](ctx)
        │
        └── ctx (UserContext)      Part 2: access matrix
              └── canSeeTaskType(id, ctx) → TASK_TYPE_ACCESS[id]
```

Two systems work together — both plug into the `policy` field on `MasterOption`:

| | Part 1 — General | Part 2 — Access Matrix |
|---|---|---|
| Entry point | `can('orders:priority:high')` | `canSeeTaskType('action_pp_destroy', ctx)` |
| Rules defined in | `src/permissions/policies/` | `src/accessMatrix/taskTypeAccess.ts` |
| Use when | Rules are unique per action | Many options share the same rule pattern |

---

## User Attributes

Three attributes arrive as props to `<App />` and are stored in Zustand:

```tsx
<App
  roles={['admin', 'manager']}
  operationIds={['OP_EXPORT', 'OP_BULK']}
  featureFlags={{ showForCourier: true, experimentalTasks: false }}
/>
```

| Attribute | Type | Example values |
|---|---|---|
| `roles` | `string[]` | `'admin'`, `'manager'`, `'courier'`, `'viewer'` |
| `operationIds` | `string[]` | `'OP_EXPORT'`, `'OP_BULK'`, `'OP_PARTNER'` |
| `featureFlags` | `Record<string, boolean>` | `'showForCourier'`, `'experimentalTasks'` |

Stored internally as `Set<string>` (roles, operationIds) and `Map<string, boolean>` (featureFlags) for O(1) lookups.

---

## Part 1 — General Permission System

### Bootstrapping

`App.tsx` receives user attributes as props and syncs them to the store:

```tsx
// src/App.tsx
export function App({ roles, operationIds, featureFlags }: TopLevelProps) {
  return (
    <BrowserRouter>
      <AppInner roles={roles} operationIds={operationIds} featureFlags={featureFlags} />
    </BrowserRouter>
  )
}
```

### Checking Permissions in Components

**Hook** — use when you need the result as a value:

```tsx
import { usePermissions } from './permissions/usePermissions'

function MyComponent() {
  const { can } = usePermissions()

  return (
    <button disabled={!can('orders:priority:high')}>
      High Priority
    </button>
  )
}
```

**`<Can>` component** — use for conditional rendering:

```tsx
import { Can } from './components/Can'

function OrderActions() {
  return (
    <Can action="admin:page:view" fallback={<span>No access</span>}>
      <AdminPanel />
    </Can>
  )
}
```

### Route Guards

Routes are protected via `ProtectedRoute`. Configuration lives in `src/routes/routeConfig.tsx`:

```tsx
export const ROUTE_CONFIG: RouteConfig[] = [
  {
    path: '/orders',
    element: <OrdersPage />,
    action: 'orders:page:view',
    redirectTo: '/dashboard',   // where to redirect if denied (default: '/dashboard')
  },
  {
    path: '/admin',
    element: <AdminPage />,
    action: 'admin:page:view',
  },
]
```

### Adding a New Action

**1.** Add to the `Action` union in `src/permissions/types.ts`:

```ts
export type Action =
  | 'orders:page:view'
  | 'my:new:action'   // ← add here
```

**2.** Add a reusable base check in `src/permissions/base.ts` if needed:

```ts
export const base = {
  canDoMyThing: (ctx: UserContext) =>
    ctx.roles.has('admin') || ctx.operationIds.has('OP_MY_THING'),
}
```

**3.** Define the policy in `src/permissions/policies/`:

```ts
// ordersPolicies.ts
export const ordersPolicies: Partial<Record<Action, PolicyFn>> = {
  'my:new:action': (ctx) => base.canDoMyThing(ctx),
}
```

**4.** Use it anywhere: `can('my:new:action')`.

---

## Part 2 — Access Matrix

### When to Use Which System

Use the **access matrix** when many options (10+) follow the same rule structure: roles + operationIds + excludeRoles + feature flag extensions. The matrix is a plain data table — easy to read, audit, and test without running any code.

Use the **general system** (Part 1) when rules are unique per action or require complex business logic.

### Access Matrix Rules

The matrix lives in `src/accessMatrix/taskTypeAccess.ts`:

```ts
export const TASK_TYPE_ACCESS: Record<string, TaskTypeAccess> = {

  // Visible to everyone (empty object or no entry at all)
  'action_pp_basic': {},

  // Role whitelist
  'action_pp_destroy': {
    roles: ['admin'],
  },

  // Role OR operationId
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],
  },

  // Blacklist — everyone except courier
  'action_pp_internal': {
    excludeRoles: ['courier'],
  },

  // Base access + flag extends to more roles
  'action_pp_special': {
    roles: ['admin'],
    extendedAccess: [
      { flag: 'showForCourier', roles: ['courier'] },
    ],
  },

  // No base access — only visible when flag is on
  'action_xx_experimental': {
    extendedAccess: [
      { flag: 'experimentalTasks', roles: ['admin', 'manager', 'courier'] },
    ],
  },
}
```

**Resolution order** inside `canSeeTaskType(id, ctx)`:

1. No entry in matrix → `true` (open to all)
2. `excludeRoles` matches → `false` (always wins, checked first)
3. Base whitelist defined (`roles` / `operationIds`) and matched → `true`
4. No base whitelist and no `extendedAccess` → `true` (open to all)
5. Check each `extendedAccess` entry: flag on AND user matches → `true`
6. Otherwise → `false`

### Adding a New Task Type Option

**1.** Add the access rule to `src/accessMatrix/taskTypeAccess.ts` (skip if open to all):

```ts
'action_pp_myoption': {
  roles: ['admin', 'manager'],
},
```

**2.** Add the option to `src/options/taskTypeOptions.ts`:

```ts
{
  id: 'action_pp_myoption',
  label: 'My Option',
  meta: { icon: '🔧', color: 'teal' },
  policy: (_can, ctx) => canSeeTaskType('action_pp_myoption', ctx),
},
```

**3.** If it should appear in the order form, add its id to `allowedValues` in `src/forms/order/resolvers/resolveOrderOptions.ts`:

```ts
const taskTypeTransform: OptionTransform = {
  allowedValues: ['action_pp_basic', 'action_pp_view', 'action_pp_destroy', 'action_pp_myoption'],
}
```

**Changing an existing rule** → one line in `taskTypeAccess.ts`, nothing else.

**Adding a flag extension** → one entry in the `extendedAccess` array for that option in `taskTypeAccess.ts`.

---

## Select Options System

### MasterOption and Policy

Every selectable option is a `MasterOption`. The `policy` field is the only place where access logic lives for that option:

```ts
interface MasterOption<TMeta = unknown> {
  id: string
  label: string
  meta?: TMeta
  policy: (can: (action: string) => boolean, ctx: UserContext) => boolean
}
```

- Use `can` to delegate to Part 1 (named actions)
- Use `ctx` to call `canSeeTaskType` (Part 2 / access matrix)
- Both can be combined in a single policy

```ts
// Part 1 only
{ id: 'high', label: 'High Priority', policy: (can) => can('orders:priority:high') }

// Part 2 only
{ id: 'action_pp_destroy', label: 'Destroy', policy: (_can, ctx) => canSeeTaskType('action_pp_destroy', ctx) }

// Both combined
{ id: 'special', label: 'Special', policy: (can, ctx) => can('orders:task:create_feature') && canSeeTaskType('action_pp_special', ctx) }
```

### resolveSelectOptions

Filters a master list down to what the current user can see:

```ts
resolveSelectOptions(masterList, can, ctx, transform?)
```

Pipeline:

1. Filter by `policy(can, ctx)` — who can see it
2. Filter by `transform.allowedValues` — where it appears (domain)
3. Apply `transform.modify` per id — how it looks (label, disabled state)
4. Strip `policy` from results — returns clean `ResolvedOption[]`

Usage in a resolver:

```ts
import { resolveSelectOptions } from '../utils/optionUtils'

export function resolveOrderOptions(can: CanFn, ctx: UserContext) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, ctx, taskTypeTransform),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can, ctx),
  }
}
```

### OptionTransform

```ts
interface OptionTransform<TMeta = unknown> {
  // only these ids will appear in the output
  allowedValues?: string[]

  // per-id overrides applied after filtering
  modify?: {
    [id: string]: (option: ResolvedOption<TMeta>, can: CanFn) => ResolvedOption<TMeta>
  }
}
```

Example — disable an option with a reason instead of hiding it:

```ts
const transform: OptionTransform = {
  allowedValues: ['action_pp_basic', 'action_pp_destroy'],
  modify: {
    'action_pp_destroy': (opt, can) => ({
      ...opt,
      disabled: !can('orders:priority:critical'),
      disabledReason: 'Only critical-priority admins can destroy',
    }),
  },
}
```

### Domain Filtering

The matrix answers **who** can see an option. `allowedValues` answers **where** it appears. They are independent:

```ts
// form resolver
const DOMAIN_TASK_TYPES = {
  my:      ['action_pp_basic', 'action_pp_create', 'action_pp_destroy'],
  common:  ['action_pp_basic', 'action_pp_view', 'action_pp_approve'],
  archive: ['action_archive_restore', 'action_pp_view'],
}

export function resolveOrderOptions(can: CanFn, ctx: UserContext, domain: string) {
  return {
    taskTypes: resolveSelectOptions(
      TASK_TYPE_OPTIONS,
      can,
      ctx,
      { allowedValues: DOMAIN_TASK_TYPES[domain] ?? [] }
    ),
  }
}
```

The final list a user sees = intersection of matrix (who) and domain (where).

---

## File Structure

```
src/
├── permissions/
│   ├── types.ts                  UserContext, Action, PolicyFn
│   ├── base.ts                   Reusable atomic checks (isAdmin, canExport, …)
│   ├── resolver.ts               resolvePermission(action, ctx) → bool
│   ├── usePermissions.ts         Hook → { can, ctx }
│   └── policies/
│       ├── index.ts              Merges all policy files
│       ├── commonPolicies.ts
│       ├── ordersPolicies.ts
│       ├── adminPolicies.ts
│       └── exportPolicies.ts
│
├── accessMatrix/
│   ├── types.ts                  TaskTypeAccess, ExtendedAccess
│   ├── taskTypeAccess.ts         TASK_TYPE_ACCESS — the matrix table
│   └── resolveTaskTypeAccess.ts  canSeeTaskType(id, ctx) → bool
│
├── options/
│   ├── priorityOptions.ts        PRIORITY_OPTIONS master list
│   └── taskTypeOptions.ts        TASK_TYPE_OPTIONS master list (uses matrix)
│
├── utils/
│   └── optionUtils.ts            MasterOption, resolveSelectOptions, extractValues
│
├── forms/
│   └── order/
│       ├── useOrderFormConfig.ts
│       └── resolvers/
│           ├── resolveOrderOptions.ts
│           ├── resolveOrderDefaults.ts
│           └── resolveOrderSchemas.ts
│
├── store/
│   └── permissionsStore.ts       Zustand store
│
├── components/
│   └── Can.tsx                   <Can action="..."> conditional render
│
├── routes/
│   ├── routeConfig.tsx           ROUTE_CONFIG
│   ├── ProtectedRoute.tsx
│   └── AppRoutes.tsx
│
└── tabs/
    └── orderTabsConfig.ts        ORDER_TABS_CONFIG
```

---

## Cheatsheet

| Task | Files to edit |
|---|---|
| Add a new protected page | `permissions/types.ts` → `policies/*.ts` → `routes/routeConfig.tsx` |
| Add a new permission check | `permissions/types.ts` → `permissions/base.ts` (optional) → `policies/*.ts` |
| Add a new task type option | `accessMatrix/taskTypeAccess.ts` → `options/taskTypeOptions.ts` → `resolvers/resolveOrderOptions.ts` |
| Change who sees an existing task type | `accessMatrix/taskTypeAccess.ts` only |
| Add a feature flag that unlocks a task type | `extendedAccess` array in `taskTypeAccess.ts` only |
| Add a new select option field to the form | New `*Options.ts` in `options/` → `resolveOrderOptions.ts` → `useOrderFormConfig.ts` |
| Disable an option instead of hiding it | `OptionTransform.modify` in the form resolver |
| Add a new domain/context | `DOMAIN_TASK_TYPES` map in `resolveOrderOptions.ts` |
| Add a new tab with access control | `tabs/orderTabsConfig.ts` + new Action in `types.ts` + policy |
