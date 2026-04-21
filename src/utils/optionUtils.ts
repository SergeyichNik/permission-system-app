import type { UserContext } from '../permissions/types'

export interface MasterOption<TMeta = unknown> {
  id: string
  label: string
  meta?: TMeta
  allowedIn?: string[]
  policy: (can: (action: string) => boolean, ctx: UserContext) => boolean
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
  ctx: UserContext,
  transform?: OptionTransform<TMeta>
): ResolvedOption<TMeta>[] {
  return masterList
    .filter((opt) => opt.policy(can, ctx))
    .filter((opt) =>
      !transform?.allowedValues ||
      transform.allowedValues.includes(opt.id)
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
