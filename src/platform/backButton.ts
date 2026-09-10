export type BackGuardResult = boolean | void | Promise<boolean | void>
export type BackGuard = () => BackGuardResult
export type BackAction = 'consumed' | 'history' | 'exit'

const guards: BackGuard[] = []

export function pushBackGuard(guard: BackGuard): () => void {
  guards.push(guard)
  return () => {
    const index = guards.lastIndexOf(guard)
    if (index >= 0) guards.splice(index, 1)
  }
}

export function backGuardCount(): number {
  return guards.length
}

export async function handleHardwareBack(canGoBack: boolean): Promise<BackAction> {
  const guard = guards.at(-1)
  if (guard) {
    const result = await guard()
    if (result !== false) return 'consumed'
  }
  if (canGoBack) return 'history'
  return 'exit'
}
