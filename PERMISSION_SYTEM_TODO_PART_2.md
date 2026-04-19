# Access Matrix System — TODO Part 2

## Context

This is a continuation of TODO.md (Part 1). Part 1 covers the general permission system (`can('action')`).
This document covers a **separate but complementary system** for cases where many options (~30+) share the same structural rules: roles + operationIds + featureFlags.

---

## When to Use Which System

```
General system (Part 1)          Access Matrix (Part 2)
────────────────────────         ──────────────────────
can('orders:priority:high')      canSeeTaskType('action_pp_destroy', ctx)

Use when:                        Use when:
- rules are unique per action    - many options (10+) with similar structure
- business logic varies widely   - rules follow the same pattern: roles + flags + ops
- few options                    - readable as a table
```

They work together — both are used inside the master option list `policy` field.

---

## File Structure to Create

```
src/
  accessMatrix/
    types.ts                    ← TaskTypeAccess, ExtendedAccess types
    taskTypeAccess.ts           ← the access matrix (the table)
    resolveTaskTypeAccess.ts    ← pure resolver function
  options/
    taskTypeOptions.ts          ← master list, updated to use matrix resolver
```

---

## Step 1 — Types

```ts
// src/accessMatrix/types.ts

// Single extended access rule — activated when flag is enabled
interface ExtendedAccess {
  // feature flag that activates this rule
  flag: string

  // roles that gain access when flag is enabled
  roles?: string[]

  // operationIds that gain access when flag is enabled
  operationIds?: string[]
}

// Access rule for a single task type option
interface TaskTypeAccess {
  // whitelist — if omitted, option is visible to everyone
  roles?: string[]
  operationIds?: string[]

  // blacklist — these roles never see the option regardless of other rules
  excludeRoles?: string[]

  // flag-based extensions — each flag can add roles and/or operationIds
  extendedAccess?: ExtendedAccess[]
}
```

---

## Step 2 — Access Matrix (the table)

This is the single source of truth for all task type visibility rules.
Each entry is one option. No entry = visible to everyone.

```ts
// src/accessMatrix/taskTypeAccess.ts
import { TaskTypeAccess } from './types'

export const TASK_TYPE_ACCESS: Record<string, TaskTypeAccess> = {

  // ── No restrictions — visible to everyone ───────────────────────────────
  // Options not listed here are also visible to everyone (no entry = open).
  // You can list them explicitly for documentation purposes:
  'action_pp_basic': {},
  'action_pp_view':  {},

  // ── Role whitelist — only specific roles ────────────────────────────────
  'action_pp_destroy': {
    roles: ['admin'],
  },

  'action_pp_approve': {
    roles: ['admin', 'manager'],
  },

  // ── OperationId whitelist ────────────────────────────────────────────────
  'action_pp_export': {
    operationIds: ['OP_EXPORT', 'OP_PREMIUM'],
  },

  // ── Role OR operationId ──────────────────────────────────────────────────
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],          // admin OR OP_BULK
  },

  // ── Blacklist — everyone except courier ─────────────────────────────────
  'action_pp_internal': {
    excludeRoles: ['courier'],
  },

  // ── Base rule + flag extends access ─────────────────────────────────────
  // Was: visible only to admin
  // Now: if flag 'showForCourier' = true, courier can also see it
  'action_pp_special': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
      },
    ],
  },

  // ── Multiple flag extensions ─────────────────────────────────────────────
  // Base: admin only
  // Flag A adds courier
  // Flag B adds OP_PARTNER operationId
  'action_pp_advanced': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
      },
      {
        flag: 'showForPartners',
        operationIds: ['OP_PARTNER'],
      },
    ],
  },

  // ── Flag required for everyone ───────────────────────────────────────────
  // No base access — only available when flag is on
  'action_xx_experimental': {
    extendedAccess: [
      {
        flag: 'experimentalTasks',
        roles: ['admin', 'manager', 'courier'],
      },
    ],
  },

  // ── Domain-specific examples (my, common, archive) ──────────────────────
  // Domains are not encoded in id — handle via separate config or filter
  // See Step 5 for domain filtering approach
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
  },
}
```

---

## Step 3 — Resolver (pure function)

```ts
// src/accessMatrix/resolveTaskTypeAccess.ts
import { UserContext } from '../permissions/types'
import { TASK_TYPE_ACCESS } from './taskTypeAccess'

export function canSeeTaskType(id: string, ctx: UserContext): boolean {
  const access = TASK_TYPE_ACCESS[id]

  // no entry in matrix — visible to everyone
  if (!access) return true

  // blacklist check — excludeRoles always wins
  if (access.excludeRoles?.some((r) => ctx.roles.has(r))) return false

  // base access check
  const hasBaseRole = access.roles?.some((r) => ctx.roles.has(r)) ?? false
  const hasBaseOp   = access.operationIds?.some((op) => ctx.operationIds.has(op)) ?? false

  // if whitelist is defined (roles or operationIds), user must match at least one
  const whitelistDefined = !!(access.roles || access.operationIds)
  const hasBaseAccess     = whitelistDefined ? hasBaseRole || hasBaseOp : true

  if (hasBaseAccess) return true

  // extended access — each extendedAccess entry is checked independently
  // if ANY entry's flag is on AND user matches its roles/operationIds → grant access
  return (
    access.extendedAccess?.some((ext) => {
      // flag must be enabled
      if (!ctx.featureFlags.get(ext.flag)) return false

      const hasExtRole = ext.roles?.some((r) => ctx.roles.has(r)) ?? false
      const hasExtOp   = ext.operationIds?.some((op) => ctx.operationIds.has(op)) ?? false

      // if extended entry defines roles or operationIds, user must match
      const extWhitelistDefined = !!(ext.roles || ext.operationIds)
      return extWhitelistDefined ? hasExtRole || hasExtOp : true
    }) ?? false
  )
}
```

---

## Step 4 — Integration with Master Option List

The matrix resolver plugs into the same `policy` field used in Part 1.
`policy` receives `can` (from general system) — we need `ctx` for the matrix.
Two options, choose one based on your preference:

### Option A — extend policy signature to accept ctx (recommended)

```ts
// src/utils/optionUtils.ts — update MasterOption type
interface MasterOption<TMeta = unknown> {
  id: string
  label: string
  meta?: TMeta
  // extend policy to also receive ctx
  policy: (can: CanFn, ctx: UserContext) => boolean
}

// update resolveSelectOptions to pass ctx
export function resolveSelectOptions<TMeta>(
  masterList: MasterOption<TMeta>[],
  can: CanFn,
  ctx: UserContext,                         // ← add ctx
  transform?: OptionTransform<TMeta>
): ResolvedOption<TMeta>[] {
  return masterList
    .filter((opt) => opt.policy(can, ctx))  // ← pass ctx
    // ... rest unchanged
}
```

```ts
// src/options/taskTypeOptions.ts
import { canSeeTaskType } from '../accessMatrix/resolveTaskTypeAccess'

export const TASK_TYPE_OPTIONS: MasterOption[] = [
  {
    id: 'action_pp_basic',
    label: 'Basic Action',
    policy: (can, ctx) => canSeeTaskType('action_pp_basic', ctx),
  },
  {
    id: 'action_pp_destroy',
    label: 'Destroy',
    policy: (can, ctx) => canSeeTaskType('action_pp_destroy', ctx),
  },
  {
    id: 'action_pp_special',
    label: 'Special Action',
    policy: (can, ctx) => canSeeTaskType('action_pp_special', ctx),
  },
  // ... all 30 options follow the same pattern
]
```

### Option B — generate master list from matrix (less boilerplate)

If all 30 options use only the matrix (no mixed general system policies):

```ts
// src/options/taskTypeOptions.ts
import { canSeeTaskType } from '../accessMatrix/resolveTaskTypeAccess'
import { TASK_TYPES } from '../constants/taskTypes'  // your existing task type definitions

// generate master list automatically from task types + matrix
export const TASK_TYPE_OPTIONS: MasterOption[] = TASK_TYPES.map((type) => ({
  id: type.id,
  label: type.label,
  meta: type.meta,
  policy: (can, ctx) => canSeeTaskType(type.id, ctx),
}))
```

### Update usePermissions to expose ctx

```ts
// src/permissions/usePermissions.ts
export function usePermissions() {
  const { roles, operationIds, featureFlags } = usePermissionsStore()

  const ctx: UserContext = useMemo(
    () => ({ roles, operationIds, featureFlags }),
    [roles, operationIds, featureFlags]
  )

  const can = useCallback(
    (action: Action): boolean => resolvePermission(action, ctx),
    [ctx]
  )

  return { can, ctx }   // ← expose ctx alongside can
}
```

### Update form resolver to pass ctx

```ts
// src/forms/order/resolvers/resolveOrderOptions.ts
export function resolveOrderOptions(can: CanFn, ctx: UserContext) {
  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, ctx),
    priorities: resolveSelectOptions(PRIORITY_OPTIONS, can, ctx),
  }
}
```

```ts
// src/forms/order/useOrderFormConfig.ts
export function useOrderFormConfig() {
  const { can, ctx } = usePermissions()   // ← destructure ctx too

  return useMemo(() => {
    const options  = resolveOrderOptions(can, ctx)   // ← pass ctx
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
  }, [can, ctx])
}
```

---

## Step 5 — Domain Filtering (my, common, archive)

Domains are not encoded in option ids — handle via transform in the form resolver.

```ts
// each domain has its own allowed task types
const DOMAIN_TASK_TYPES: Record<string, string[]> = {
  my:      ['action_pp_basic', 'action_pp_create', 'action_pp_destroy'],
  common:  ['action_pp_basic', 'action_pp_view', 'action_pp_approve'],
  archive: ['action_archive_restore', 'action_pp_view'],
}

// form resolver applies domain filter via allowedValues transform
export function resolveOrderOptions(can: CanFn, ctx: UserContext, domain: string) {
  const domainTransform: OptionTransform = {
    allowedValues: DOMAIN_TASK_TYPES[domain] ?? [],
  }

  return {
    taskTypes: resolveSelectOptions(TASK_TYPE_OPTIONS, can, ctx, domainTransform),
  }
}
```

Domain + matrix work together:
```
resolveSelectOptions
  → filter by matrix (canSeeTaskType)     ← who can see it
  → filter by allowedValues (domain)      ← where it appears
  → apply modify transform                ← how it looks
```

---

## Step 6 — Full Flow Diagram

```
TASK_TYPE_ACCESS (matrix table)
  'action_pp_destroy': { roles: ['admin'], extendedAccess: [...] }
        │
        ▼
canSeeTaskType(id, ctx)          ← pure function, no hooks
  1. no entry → true
  2. excludeRoles → false if match
  3. base roles/operationIds → true if match
  4. extendedAccess → check flag + roles/operationIds
        │
        ▼
TASK_TYPE_OPTIONS master list
  { id: 'action_pp_destroy', policy: (can, ctx) => canSeeTaskType(id, ctx) }
        │
        ▼
resolveSelectOptions(masterList, can, ctx, domainTransform)
  1. filter by policy (matrix)
  2. filter by allowedValues (domain)
  3. apply modify transform
        │
        ▼
ResolvedOption[]                 ← clean array, no logic, ready for component
        │
        ├──▶ extractValues()     → validList for schemaFabric
        ├──▶ formComponentsProps → passed to TaskTypeSelect component
        └──▶ resolveDefaults()   → first available as default value
```

---

## Adding New Things — Cheatsheet (Part 2)

**New task type option**
→ add to `TASK_TYPES` constants (your existing source)
→ if Option B (auto-generation): done, master list updates automatically
→ if Option A (manual): one entry in `TASK_TYPE_OPTIONS`
→ if access restriction needed: one entry in `TASK_TYPE_ACCESS`

**Change visibility rule for existing option**
→ one line in `TASK_TYPE_ACCESS`

**Add flag that extends access for existing option**
→ one entry in `extendedAccess` array for that option in `TASK_TYPE_ACCESS`

**New domain**
→ one entry in `DOMAIN_TASK_TYPES` with its allowed task type ids

**Option visible in new domain**
→ add its id to the relevant domain array in `DOMAIN_TASK_TYPES`

---

## Key Rules — Access Matrix

| Rule | Why |
|---|---|
| No entry in matrix = visible to everyone | Safe default for non-restricted options |
| `excludeRoles` always wins over everything else | Explicit denial is unambiguous |
| Base access checked before extendedAccess | Flag extensions are additive, not replacing |
| Domain filtering via `allowedValues` transform, not in matrix | Matrix is about WHO, domain is about WHERE |
| Matrix is data, not functions | Easy to read, easy to audit, easy to test |