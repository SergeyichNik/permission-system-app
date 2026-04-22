export function stripAccessFields<T>(
  item: T
): Omit<T, 'policy' | 'allowedIn' | 'overrides'> {
  const {
    policy: _policy,
    allowedIn: _allowedIn,
    overrides: _overrides,
    ...rest
  } = item as T & {
    policy?: unknown
    allowedIn?: unknown
    overrides?: unknown
  }
  void _policy
  void _allowedIn
  void _overrides
  return rest as Omit<T, 'policy' | 'allowedIn' | 'overrides'>
}
