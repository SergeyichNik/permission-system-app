import type { AccessGatedItem } from '../access/types'
import { filterAccessible } from '../access/accessible'
import type { CanFn, UserContext } from '../permissions/types'

export interface MasterOption<TMeta = unknown> extends AccessGatedItem {
  id: string
  label: string
  meta?: TMeta
  policy: (can: CanFn, ctx: UserContext) => boolean
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
      can: CanFn
    ) => ResolvedOption<TMeta>
  }
}

export function resolveSelectOptions<TMeta>(
  masterList: MasterOption<TMeta>[],
  can: CanFn,
  ctx: UserContext,
  transform?: OptionTransform<TMeta>,
  domain?: string
): ResolvedOption<TMeta>[] {
  return filterAccessible(masterList, can, ctx, domain)
    .filter(
      (opt) =>
        !transform?.allowedValues || transform.allowedValues.includes(opt.id)
    )
    .map(({ policy: _policy, ...opt }) => opt as ResolvedOption<TMeta>)
    .map((opt) => transform?.modify?.[opt.id]?.(opt, can) ?? opt)
}

export function extractValues(options: ResolvedOption[]): string[] {
  return options.map((opt) => opt.id)
}

export function extractActiveValues(options: ResolvedOption[]): string[] {
  return options.filter((opt) => !opt.disabled).map((opt) => opt.id)
}
