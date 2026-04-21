# Access Matrix — TODO Part 3
# Override Excludes: flag that lifts a blacklist

## Context

This is a continuation of TODO Part 2.
Part 2 covers the base access matrix with `excludeRoles`, `excludeOperationIds`, and `extendedAccess`.

This document covers one specific addition: a case where an option is blacklisted by default,
but a feature flag can **lift the ban** for specific roles or operationIds.

---

## The Problem

Current model has a contradiction:

```ts
// ❌ conflict — courier is blacklisted, but extendedAccess tries to add it back
'action_pp_special': {
  excludeRoles: ['courier'],
  extendedAccess: [
    { flag: 'showForCourier', roles: ['courier'] }  // never fires — blacklist wins
  ]
}
```

This happens when:
- You know WHO is forbidden (blacklist) but not the full whitelist
- A feature flag should be able to lift the ban for specific roles/operationIds

---

## Three Distinct Semantics (must be explicit in config)

```
excludeRoles (no overrideExcludes)    → "never, even with a flag"
excludeRoles + overrideExcludes:true  → "forbidden by default, flag can lift the ban"
roles whitelist                       → "only these, flag can add more"
```

---

## Step 1 — Update Types

```ts
// src/accessMatrix/types.ts

interface ExtendedAccess {
  flag: string
  roles?: string[]
  operationIds?: string[]

  // NEW — explicitly states this flag can lift the blacklist
  // without this, excludeRoles/excludeOperationIds always win
  overrideExcludes?: boolean
}

interface TaskTypeAccess {
  roles?: string[]
  operationIds?: string[]
  excludeRoles?: string[]
  excludeOperationIds?: string[]
  extendedAccess?: ExtendedAccess[]
}
```

---

## Step 2 — Update Resolver

Replace the existing `canSeeTaskType` function in `src/accessMatrix/resolveTaskTypeAccess.ts`:

```ts
// src/accessMatrix/resolveTaskTypeAccess.ts

export function canSeeTaskType(id: string, ctx: UserContext): boolean {
  const access = TASK_TYPE_ACCESS[id]

  // no entry — visible to everyone
  if (!access) return true

  // check if any active flag with overrideExcludes lifts the blacklist for this user
  const blacklistOverridden = access.extendedAccess?.some(ext => {
    if (!ext.overrideExcludes) return false
    if (!ctx.featureFlags.get(ext.flag)) return false

    const hasExtRole = ext.roles?.some(r => ctx.roles.has(r)) ?? false
    const hasExtOp   = ext.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
    const extWhitelistDefined = !!(ext.roles || ext.operationIds)

    return extWhitelistDefined ? hasExtRole || hasExtOp : true
  }) ?? false

  // blacklist — only applies if not overridden by a flag
  if (!blacklistOverridden) {
    if (access.excludeRoles?.some(r => ctx.roles.has(r))) return false
    if (access.excludeOperationIds?.some(op => ctx.operationIds.has(op))) return false
  }

  // base whitelist check
  const whitelistDefined = !!(access.roles || access.operationIds)
  const hasBaseRole = access.roles?.some(r => ctx.roles.has(r)) ?? false
  const hasBaseOp   = access.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
  const hasBaseAccess = whitelistDefined ? hasBaseRole || hasBaseOp : true

  if (hasBaseAccess) return true

  // extended access — flag adds new roles/operationIds
  return access.extendedAccess?.some(ext => {
    if (!ctx.featureFlags.get(ext.flag)) return false

    const hasExtRole = ext.roles?.some(r => ctx.roles.has(r)) ?? false
    const hasExtOp   = ext.operationIds?.some(op => ctx.operationIds.has(op)) ?? false
    const extWhitelistDefined = !!(ext.roles || ext.operationIds)

    return extWhitelistDefined ? hasExtRole || hasExtOp : true
  }) ?? false
}
```

---

## Step 3 — Update Dev Validation

Add the new conflict check to the existing `validateAccessMatrix` function:

```ts
// src/accessMatrix/resolveTaskTypeAccess.ts

export function validateAccessMatrix(matrix: Record<string, TaskTypeAccess>) {
  if (process.env.NODE_ENV !== 'development') return

  for (const [id, access] of Object.entries(matrix)) {
    access.extendedAccess?.forEach(ext => {

      // existing check — flag tries to grant access to blacklisted role/op without overrideExcludes
      const conflictRole = ext.roles?.some(r => access.excludeRoles?.includes(r))
      const conflictOp   = ext.operationIds?.some(op => access.excludeOperationIds?.includes(op))

      if ((conflictRole || conflictOp) && !ext.overrideExcludes) {
        console.warn(
          `[AccessMatrix] "${id}": extendedAccess flag "${ext.flag}" targets blacklisted ` +
          `roles/operationIds but "overrideExcludes" is not set. ` +
          `Flag will never grant access. Add overrideExcludes:true if intentional.`
        )
      }

      // new check — overrideExcludes set but no blacklist exists (pointless)
      const hasBlacklist = !!(access.excludeRoles?.length || access.excludeOperationIds?.length)
      if (ext.overrideExcludes && !hasBlacklist) {
        console.warn(
          `[AccessMatrix] "${id}": extendedAccess flag "${ext.flag}" has overrideExcludes:true ` +
          `but no excludeRoles or excludeOperationIds exist. overrideExcludes is pointless here.`
        )
      }
    })
  }
}
```

---

## Step 4 — Full Access Matrix with All Cases

```ts
// src/accessMatrix/taskTypeAccess.ts

export const TASK_TYPE_ACCESS: Record<string, TaskTypeAccess> = {

  // ── Visible to everyone ──────────────────────────────────────────────────
  'action_basic_view': {},

  // ── Role whitelist only ──────────────────────────────────────────────────
  'action_admin_only': {
    roles: ['admin'],
  },

  // ── OperationId only ─────────────────────────────────────────────────────
  'action_pp_export': {
    operationIds: ['OP_EXPORT', 'OP_PREMIUM'],
  },

  // ── Role OR operationId ──────────────────────────────────────────────────
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],
  },

  // ── Blacklist role, hard — flag cannot lift this ─────────────────────────
  // courier is NEVER allowed, even if a flag is enabled
  'action_no_courier_ever': {
    excludeRoles: ['courier'],
    // no extendedAccess with overrideExcludes — ban is permanent
  },

  // ── Blacklist operationId, hard ──────────────────────────────────────────
  'action_no_readonly': {
    excludeOperationIds: ['OP_READONLY', 'OP_GUEST'],
  },

  // ── Blacklist role, soft — flag CAN lift the ban ─────────────────────────
  // courier is forbidden by default
  // but if flag 'showForCourier' = true → courier gains access
  'action_pp_special': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
        overrideExcludes: true,   // explicitly lifts the ban for courier
      },
    ],
  },

  // ── Blacklist operationId, soft — flag lifts the ban ─────────────────────
  // OP_READONLY is forbidden by default
  // flag 'unblockReadonly' lifts the ban for OP_READONLY
  'action_pp_unblockable': {
    excludeOperationIds: ['OP_READONLY'],
    extendedAccess: [
      {
        flag: 'unblockReadonly',
        operationIds: ['OP_READONLY'],
        overrideExcludes: true,
      },
    ],
  },

  // ── Blacklist role + flag lifts for role AND operationId ─────────────────
  // courier and guest are forbidden
  // flag 'partnerAccess' lifts ban for courier AND adds OP_PARTNER
  'action_pp_partner': {
    excludeRoles: ['courier', 'guest'],
    extendedAccess: [
      {
        flag: 'partnerAccess',
        roles: ['courier'],          // lifts ban for courier
        operationIds: ['OP_PARTNER'],// also adds OP_PARTNER (not in blacklist, just additive)
        overrideExcludes: true,
      },
    ],
  },

  // ── Whitelist + flag adds more roles ─────────────────────────────────────
  // base: admin only
  // flag adds courier — no blacklist, just extension
  'action_pp_extendable': {
    roles: ['admin'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        roles: ['courier'],
        // no overrideExcludes needed — there is no blacklist
      },
    ],
  },

  // ── Whitelist + flag adds operationId ────────────────────────────────────
  // base: OP_PREMIUM
  // flag adds OP_TEAM and OP_BUSINESS
  'action_pp_priority': {
    operationIds: ['OP_PREMIUM'],
    extendedAccess: [
      {
        flag: 'extendedPriority',
        operationIds: ['OP_TEAM', 'OP_BUSINESS'],
      },
    ],
  },

  // ── Multiple flags, each adds independently ──────────────────────────────
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
      {
        flag: 'showForTeams',
        roles: ['manager'],
        operationIds: ['OP_TEAM'],
      },
    ],
  },

  // ── Flag required, no base access ────────────────────────────────────────
  'action_xx_experimental': {
    extendedAccess: [
      {
        flag: 'experimentalTasks',
        roles: ['admin', 'manager'],
      },
    ],
  },

  // ── Blacklist + flag lifts + domain filtered via allowedIn ───────────────
  // courier banned, flag can unban
  // only available in 'my' and 'common' domains (set in master list allowedIn)
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'restoreForCourier',
        roles: ['courier'],
        overrideExcludes: true,
      },
    ],
  },
}
```

---

## Step 5 — Decision Table (read as: what wins)

```
Case                                              Result
────────────────────────────────────────────────────────────────────────
role in excludeRoles, no flag active              → DENIED
role in excludeRoles, flag active, no override    → DENIED (blacklist wins)
role in excludeRoles, flag active, override:true  → ALLOWED (flag lifts ban)
role in whitelist, no flag needed                 → ALLOWED
role not in whitelist, flag adds it               → ALLOWED
role in excludeRoles AND whitelist                → DENIED (exclude wins)
no entry in matrix                                → ALLOWED (open by default)
```

---

## Step 6 — Domain Integration (unchanged from Part 2)

Domain filtering happens in `allowedIn` on the master list — not in the matrix.
Matrix answers WHO. Domain answers WHERE.

```ts
// src/options/taskTypeOptions.ts
export const TASK_TYPE_OPTIONS: MasterOption[] = [
  {
    id: 'action_basic_view',
    label: 'View',
    allowedIn: ['my', 'common', 'archive'],
    policy: (can, ctx) => canSeeTaskType('action_basic_view', ctx),
  },
  {
    id: 'action_archive_restore',
    label: 'Restore',
    allowedIn: ['archive'],                   // only in archive domain
    policy: (can, ctx) => canSeeTaskType('action_archive_restore', ctx),
  },
  {
    id: 'action_pp_special',
    label: 'Special',
    allowedIn: ['my', 'common'],              // not in archive
    policy: (can, ctx) => canSeeTaskType('action_pp_special', ctx),
  },
  {
    id: 'action_xx_experimental',
    label: 'Experimental',
    allowedIn: ['my'],                        // only in my domain
    policy: (can, ctx) => canSeeTaskType('action_xx_experimental', ctx),
  },
]
```

---

## Cheatsheet — What Changes Where

**Option forbidden by default, flag should lift the ban**
→ use `excludeRoles` or `excludeOperationIds`
→ add `extendedAccess` entry with `overrideExcludes: true`
→ matrix only, nothing else changes

**Option forbidden permanently, flag must not affect it**
→ use `excludeRoles` or `excludeOperationIds`
→ do NOT add `overrideExcludes` in any extendedAccess entry
→ resolver guarantees flag cannot override it

**Option available to some, flag adds more**
→ use `roles` or `operationIds` whitelist
→ add `extendedAccess` without `overrideExcludes`
→ no blacklist needed

**New flag that lifts existing ban**
→ one `extendedAccess` entry with `overrideExcludes: true` in matrix
→ add flag key to `UserContext.featureFlags` source
→ nothing else changes