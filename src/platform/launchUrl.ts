let nativeOpenConsumed = false

/**
 * Cold-start `getLaunchUrl` must not run again after `appUrlOpen`.
 * Re-applying a stale launch URL (often `arin://app/`) sent the user back home.
 */
export function consumeLaunchUrlOnce(url: string | null | undefined): string | undefined {
  if (nativeOpenConsumed) return undefined
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  nativeOpenConsumed = true
  return trimmed
}

export function markNativeUrlHandled(): void {
  nativeOpenConsumed = true
}

export function resetLaunchUrlGateForTests(): void {
  nativeOpenConsumed = false
}
