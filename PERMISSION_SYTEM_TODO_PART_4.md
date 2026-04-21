# Access Matrix — TODO Part 4
# Generic resolveAccess + Constraints + Boundary Cases

## Context

This is a continuation of TODO Part 3.
Part 3 covers `overrideExcludes` (now replaced by explicit patch operations).

This document covers:
1. Renaming `TaskTypeAccess` to a generic `AccessRule`
2. Generic `AccessMatrix<TKey>` constraint
3. Universal `resolveAccess` reusable for any entity (options, columns, tabs, etc.)
4. Exhaustive boundary cases

---

## Step 1 — Update Types

Replace existing types in `src/accessMatrix/types.ts`:

```ts
// src/accessMatrix/types.ts

export interface ExtendedAccess {
  // feature flag that activates this patch
  flag: string

  // add to whitelist if flag is active
  addRoles?: string[]
  addOperationIds?: string[]

  // remove from blacklist if flag is active
  removeExcludeRoles?: string[]
  removeExcludeOperationIds?: string[]
}

// generic access rule — same structure for any entity
export interface AccessRule {
  roles?: string[]
  operationIds?: string[]
  excludeRoles?: string[]
  excludeOperationIds?: string[]
  extendedAccess?: ExtendedAccess[]
}

// generic matrix — TKey constrains allowed ids
export type AccessMatrix<TKey extends string = string> = Record<TKey, AccessRule>
```

---

## Step 2 — Replace Resolver

Replace existing `canSeeTaskType` resolver in `src/accessMatrix/resolveTaskTypeAccess.ts`
with a new generic file `src/accessMatrix/resolveAccess.ts`:

```ts
// src/accessMatrix/resolveAccess.ts

import { UserContext } from '../permissions/types'
import { AccessMatrix, AccessRule, ExtendedAccess } from './types'

// ── Internal: apply active flag patches to base rule ──────────────────────
function applyExtensions(
  base: Required<Omit<AccessRule, 'extendedAccess'>>,
  ctx: UserContext,
  extensions: ExtendedAccess[] = []
): Required<Omit<AccessRule, 'extendedAccess'>> {
  const effective = {
    roles:               [...base.roles],
    operationIds:        [...base.operationIds],
    excludeRoles:        [...base.excludeRoles],
    excludeOperationIds: [...base.excludeOperationIds],
  }

  for (const ext of extensions) {
    // skip if flag is not active
    if (!ctx.featureFlags.get(ext.flag)) continue

    if (ext.addRoles)
      effective.roles.push(...ext.addRoles)

    if (ext.addOperationIds)
      effective.operationIds.push(...ext.addOperationIds)

    if (ext.removeExcludeRoles)
      effective.excludeRoles = effective.excludeRoles
        .filter(r => !ext.removeExcludeRoles!.includes(r))

    if (ext.removeExcludeOperationIds)
      effective.excludeOperationIds = effective.excludeOperationIds
        .filter(op => !ext.removeExcludeOperationIds!.includes(op))
  }

  return effective
}

// ── Public: resolve access for a single entity id ─────────────────────────
export function resolveAccess<TKey extends string>(
  matrix: AccessMatrix<TKey>,
  id: TKey,
  ctx: UserContext
): boolean {
  const rule = matrix[id]

  // no entry in matrix — visible to everyone by default
  if (!rule) return true

  // pass 1: apply active flag patches → build effective rule
  const effective = applyExtensions(
    {
      roles:               rule.roles ?? [],
      operationIds:        rule.operationIds ?? [],
      excludeRoles:        rule.excludeRoles ?? [],
      excludeOperationIds: rule.excludeOperationIds ?? [],
    },
    ctx,
    rule.extendedAccess
  )

  // pass 2: resolve against effective rule

  // blacklist always checked first — after patches are applied
  if (effective.excludeRoles.some(r => ctx.roles.has(r))) return false
  if (effective.excludeOperationIds.some(op => ctx.operationIds.has(op))) return false

  // if no whitelist defined — open to everyone (who passed blacklist)
  const whitelistDefined =
    rule.roles !== undefined ||
    rule.operationIds !== undefined

  if (!whitelistDefined) return true

  // whitelist check against effective (may include addRoles/addOperationIds from flags)
  return (
    effective.roles.some(r => ctx.roles.has(r)) ||
    effective.operationIds.some(op => ctx.operationIds.has(op))
  )
}
```

---

## Step 3 — Entity-Specific Matrix Files

Each entity has its own matrix file. `resolveAccess` is never modified.

```ts
// src/accessMatrix/taskTypeAccess.ts

import { AccessMatrix } from './types'
import { UserContext } from '../permissions/types'
import { resolveAccess } from './resolveAccess'

// constrain allowed ids with a union type
export type TaskTypeId =
  | 'action_basic_view'
  | 'action_admin_only'
  | 'action_pp_export'
  | 'action_pp_bulk'
  | 'action_no_courier_ever'
  | 'action_no_readonly'
  | 'action_pp_special'
  | 'action_pp_priority'
  | 'action_pp_advanced'
  | 'action_hidden_by_default'
  | 'action_archive_restore'

export const TASK_TYPE_ACCESS: AccessMatrix<TaskTypeId> = {
  // see Step 4 for full matrix with all boundary cases
}

export const canSeeTaskType = (id: TaskTypeId, ctx: UserContext): boolean =>
  resolveAccess(TASK_TYPE_ACCESS, id, ctx)
```

```ts
// src/accessMatrix/columnAccess.ts

import { AccessMatrix } from './types'
import { UserContext } from '../permissions/types'
import { resolveAccess } from './resolveAccess'

export type ColumnId =
  | 'col_price'
  | 'col_internal_id'
  | 'col_courier_info'
  | 'col_experimental'

export const COLUMN_ACCESS: AccessMatrix<ColumnId> = {
  'col_price': {
    roles: ['admin', 'manager'],
  },
  'col_internal_id': {
    roles: ['admin'],
  },
  'col_courier_info': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showCourierInfo',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
    ],
  },
  'col_experimental': {
    roles: [],
    extendedAccess: [
      {
        flag: 'experimentalColumns',
        addRoles: ['admin', 'manager'],
      },
    ],
  },
}

export const canSeeColumn = (id: ColumnId, ctx: UserContext): boolean =>
  resolveAccess(COLUMN_ACCESS, id, ctx)
```

---

## Step 4 — Full Matrix with All Boundary Cases

```ts
// src/accessMatrix/taskTypeAccess.ts — full TASK_TYPE_ACCESS

export const TASK_TYPE_ACCESS: AccessMatrix<TaskTypeId> = {

  // ── BOUNDARY: visible to everyone ────────────────────────────────────────
  // no entry = open. explicit empty object = also open.
  // use explicit entry for documentation purposes.
  'action_basic_view': {},
  // resolver: no whitelist defined → true for everyone


  // ── BOUNDARY: visible to nobody, ever ────────────────────────────────────
  // empty whitelist, no extendedAccess
  // no flag can change this
  'action_nobody': {
    roles: [],
    operationIds: [],
    // roles is defined but empty → whitelistDefined=true, but no match possible
  },
  // resolver: whitelistDefined=true, effective.roles=[], effective.operationIds=[] → false


  // ── BOUNDARY: visible to nobody by default, flag opens for operationIds ──
  // roles:[] closes base access for everyone
  // flag adds operationIds to effective whitelist
  'action_hidden_by_default': {
    roles: [],
    extendedAccess: [
      {
        flag: 'unlockForPremium',
        addOperationIds: ['OP_PREMIUM', 'OP_ENTERPRISE'],
      },
    ],
  },
  // resolver pass 1: flag active → effective.operationIds = ['OP_PREMIUM', 'OP_ENTERPRISE']
  // resolver pass 2: whitelistDefined=true (roles:[]) → check effective.operationIds → true if match
  // resolver pass 2: flag inactive → effective.operationIds=[] → false


  // ── BOUNDARY: visible to nobody by default, flag opens for roles ─────────
  'action_hidden_opens_for_roles': {
    roles: [],
    extendedAccess: [
      {
        flag: 'betaAccess',
        addRoles: ['admin', 'manager'],
      },
    ],
  },
  // resolver: same as above but roles-based


  // ── BOUNDARY: visible to all except blacklisted role, permanent ───────────
  // courier is NEVER allowed — no flag can lift this
  // no extendedAccess with removeExcludeRoles → blacklist is permanent
  'action_no_courier_ever': {
    excludeRoles: ['courier'],
  },
  // resolver: no whitelist → open to all EXCEPT courier → always false for courier


  // ── BOUNDARY: visible to all except blacklisted operationId, permanent ───
  'action_no_readonly': {
    excludeOperationIds: ['OP_READONLY', 'OP_GUEST'],
  },
  // resolver: open to all except OP_READONLY and OP_GUEST


  // ── BOUNDARY: blacklisted role, flag lifts the ban ────────────────────────
  // courier forbidden by default
  // flag removes courier from excludeRoles AND adds to whitelist
  // both operations needed: remove from blacklist + add to whitelist
  'action_pp_special': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        removeExcludeRoles: ['courier'],   // lift the ban
        addRoles: ['courier'],             // grant access
      },
    ],
  },
  // resolver pass 1 (flag active):
  //   effective.excludeRoles = [] (courier removed)
  //   effective.roles = ['admin', 'courier'] (courier added)
  // resolver pass 2: courier passes blacklist + whitelist → true
  //
  // resolver pass 1 (flag inactive):
  //   effective.excludeRoles = ['courier'] (unchanged)
  //   effective.roles = ['admin'] (unchanged)
  // resolver pass 2: courier hits blacklist → false


  // ── BOUNDARY: blacklisted operationId, flag lifts the ban ────────────────
  'action_pp_unblockable': {
    excludeOperationIds: ['OP_READONLY'],
    extendedAccess: [
      {
        flag: 'unblockReadonly',
        removeExcludeOperationIds: ['OP_READONLY'],
        addOperationIds: ['OP_READONLY'],
      },
    ],
  },


  // ── BOUNDARY: open to all except blacklisted, flag only removes ban ───────
  // no whitelist — everyone passes if not blacklisted
  // flag removes courier from blacklist, no addRoles needed
  // result: courier goes from denied → allowed (everyone-else behavior)
  'action_open_except_courier': {
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'removeBlockForCourier',
        removeExcludeRoles: ['courier'],
        // no addRoles — whitelist not defined, so open to all after blacklist passes
      },
    ],
  },
  // resolver pass 1 (flag active): effective.excludeRoles = []
  // resolver pass 2: whitelistDefined=false → true for everyone including courier
  //
  // resolver pass 1 (flag inactive): effective.excludeRoles = ['courier']
  // resolver pass 2: courier → false, everyone else → true


  // ── BOUNDARY: role OR operationId ────────────────────────────────────────
  'action_pp_bulk': {
    roles: ['admin'],
    operationIds: ['OP_BULK'],
    // access if: roles has 'admin' OR operationIds has 'OP_BULK'
  },


  // ── BOUNDARY: whitelist + flag extends it ────────────────────────────────
  // flag adds more to existing whitelist — no blacklist involved
  'action_pp_priority': {
    operationIds: ['OP_PREMIUM'],
    extendedAccess: [
      {
        flag: 'extendedPriority',
        addOperationIds: ['OP_TEAM', 'OP_BUSINESS'],
      },
    ],
  },
  // resolver pass 1 (flag active):
  //   effective.operationIds = ['OP_PREMIUM', 'OP_TEAM', 'OP_BUSINESS']
  // resolver pass 2: true for any of the three


  // ── BOUNDARY: multiple flags, each patches independently ─────────────────
  // flags are independent — each one may or may not be active
  'action_pp_advanced': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'showForCourier',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
      {
        flag: 'showForPartners',
        addOperationIds: ['OP_PARTNER'],
      },
      {
        flag: 'showForTeams',
        addRoles: ['manager'],
        addOperationIds: ['OP_TEAM'],
      },
    ],
  },
  // each flag patches independently — all active patches are applied before pass 2


  // ── BOUNDARY: blacklist + whitelist + flag adds to both ──────────────────
  // courier and guest banned
  // flag lifts ban for courier and adds OP_PARTNER
  'action_pp_partner': {
    roles: ['admin', 'manager'],
    excludeRoles: ['courier', 'guest'],
    extendedAccess: [
      {
        flag: 'partnerAccess',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
        addOperationIds: ['OP_PARTNER'],
      },
    ],
  },


  // ── BOUNDARY: domain-specific, access + domain = allowedIn in master list ─
  // access rule controls WHO — domain controls WHERE (via allowedIn in master list)
  // these are separate concerns — never encode domain in the matrix
  'action_archive_restore': {
    roles: ['admin'],
    excludeRoles: ['courier'],
    extendedAccess: [
      {
        flag: 'restoreForCourier',
        removeExcludeRoles: ['courier'],
        addRoles: ['courier'],
      },
    ],
  },
  // master list sets: allowedIn: ['archive'] — only appears in archive domain
  // matrix only controls who can see it when it appears
}
```

---

## Step 5 — Update Dev Validation

Replace existing `validateAccessMatrix` to work with generic `AccessMatrix<TKey>`:

```ts
// src/accessMatrix/validateAccess.ts

import { AccessMatrix, AccessRule } from './types'

export function validateAccessMatrix<TKey extends string>(
  matrix: AccessMatrix<TKey>,
  label: string   // e.g. 'TASK_TYPE_ACCESS', 'COLUMN_ACCESS' — for readable warnings
): void {
  if (process.env.NODE_ENV !== 'development') return

  for (const [id, rule] of Object.entries(matrix) as [string, AccessRule][]) {
    const tag = `[AccessMatrix:${label}] "${id}":`

    for (const ext of rule.extendedAccess ?? []) {

      // flag tries to add to blacklisted role without removing from excludeRoles first
      const addToBlacklistedRole = ext.addRoles?.some(r =>
        rule.excludeRoles?.includes(r) &&
        !ext.removeExcludeRoles?.includes(r)
      )
      if (addToBlacklistedRole) {
        console.warn(
          `${tag} flag "${ext.flag}" adds roles that are still in excludeRoles. ` +
          `Add removeExcludeRoles to lift the ban first, otherwise addRoles has no effect.`
        )
      }

      // same for operationIds
      const addToBlacklistedOp = ext.addOperationIds?.some(op =>
        rule.excludeOperationIds?.includes(op) &&
        !ext.removeExcludeOperationIds?.includes(op)
      )
      if (addToBlacklistedOp) {
        console.warn(
          `${tag} flag "${ext.flag}" adds operationIds that are still in excludeOperationIds. ` +
          `Add removeExcludeOperationIds to lift the ban first.`
        )
      }

      // removeExcludeRoles targets role not in excludeRoles — pointless
      const removeNonExistent = ext.removeExcludeRoles?.some(r =>
        !rule.excludeRoles?.includes(r)
      )
      if (removeNonExistent) {
        console.warn(
          `${tag} flag "${ext.flag}" has removeExcludeRoles with roles ` +
          `not present in excludeRoles. This patch has no effect.`
        )
      }

      // extendedAccess exists but no base restriction — flag never needed
      const noBaseRestriction =
        rule.roles === undefined &&
        rule.operationIds === undefined &&
        !rule.excludeRoles?.length &&
        !rule.excludeOperationIds?.length

      if (noBaseRestriction && rule.extendedAccess?.length) {
        console.warn(
          `${tag} has extendedAccess but no base restriction. ` +
          `All users pass base check — extendedAccess never fires. ` +
          `Add roles:[] to close base access if flag-only behavior is intended.`
        )
      }
    }
  }
}

// usage — call once at app init
// validateAccessMatrix(TASK_TYPE_ACCESS, 'TASK_TYPE_ACCESS')
// validateAccessMatrix(COLUMN_ACCESS, 'COLUMN_ACCESS')
```

---

## Step 6 — Integration in Master List (unchanged pattern, updated call)

```ts
// src/options/taskTypeOptions.ts

import { canSeeTaskType, TaskTypeId } from '../accessMatrix/taskTypeAccess'
import { MasterOption } from '../utils/optionUtils'

export const TASK_TYPE_OPTIONS: MasterOption[] = [
  {
    id: 'action_basic_view' satisfies TaskTypeId,
    label: 'View',
    allowedIn: ['my', 'common', 'archive'],
    policy: (can, ctx) => canSeeTaskType('action_basic_view', ctx),
  },
  {
    id: 'action_hidden_by_default' satisfies TaskTypeId,
    label: 'Premium Action',
    allowedIn: ['my', 'common'],
    policy: (can, ctx) => canSeeTaskType('action_hidden_by_default', ctx),
  },
  {
    id: 'action_pp_special' satisfies TaskTypeId,
    label: 'Special',
    allowedIn: ['my', 'common'],
    policy: (can, ctx) => canSeeTaskType('action_pp_special', ctx),
  },
  {
    id: 'action_archive_restore' satisfies TaskTypeId,
    label: 'Restore',
    allowedIn: ['archive'],
    policy: (can, ctx) => canSeeTaskType('action_archive_restore', ctx),
  },
]
```

---

## Step 7 — File Structure After Part 4

```
src/
  accessMatrix/
    types.ts                  ← AccessRule, ExtendedAccess, AccessMatrix<TKey>
    resolveAccess.ts          ← generic resolver + applyExtensions (never modified)
    validateAccess.ts         ← generic dev validation
    taskTypeAccess.ts         ← AccessMatrix<TaskTypeId> + canSeeTaskType
    columnAccess.ts           ← AccessMatrix<ColumnId> + canSeeColumn
    tabAccess.ts              ← AccessMatrix<TabId> + canSeeTab  (if needed)
```

Adding a new entity = new file. `resolveAccess.ts` is never touched.

---

## Boundary Cases — Decision Table

```
Config                                          Flag state    Result
────────────────────────────────────────────────────────────────────────────────
{}  (no entry or empty)                         any           ALLOWED (everyone)
{ roles: [] }                                   any           DENIED (nobody)
{ roles: [] } + addRoles in extendedAccess      flag off      DENIED
{ roles: [] } + addRoles in extendedAccess      flag on       ALLOWED (added roles)
{ excludeRoles: ['courier'] }                   any           DENIED for courier
{ excludeRoles: ['courier'] }                   any           ALLOWED for others
{ excludeRoles } + removeExcludeRoles           flag off      DENIED (blacklist intact)
{ excludeRoles } + removeExcludeRoles           flag on       blacklist lifted → check whitelist
{ roles: ['admin'] } + addRoles: ['courier']    flag on       ALLOWED for admin AND courier
{ excludeRoles } + addRoles without remove      flag on       DENIED (still in blacklist)
{ excludeOperationIds } + removeExcludeOps      flag on       blacklist lifted for that op
multiple extendedAccess entries                 mixed flags   each patch applied independently
```

---

## Cheatsheet — What Changes Where in Part 4

**Rename TaskTypeAccess to AccessRule**
→ `src/accessMatrix/types.ts` only

**Make resolver generic**
→ `src/accessMatrix/resolveAccess.ts` — new file, replaces `resolveTaskTypeAccess.ts`

**Add new entity matrix (e.g. tabs)**
→ new file `src/accessMatrix/tabAccess.ts`
→ define `TabId` union type
→ define `TAB_ACCESS: AccessMatrix<TabId>`
→ export `canSeeTab = (id, ctx) => resolveAccess(TAB_ACCESS, id, ctx)`
→ `resolveAccess.ts` untouched

**Add new boundary case to existing matrix**
→ one entry in the relevant `*Access.ts` file
→ nothing else changes