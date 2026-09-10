import { Capacitor } from '@capacitor/core'

export type HostRuntime = 'web' | 'android' | 'ios'

export function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform()
}

export function getHostRuntime(): HostRuntime {
  const platform = Capacitor.getPlatform()
  if (platform === 'android' || platform === 'ios') return platform
  return 'web'
}

export function applyRuntimeDomFlags(): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('is-native', isNativeRuntime())
  document.documentElement.dataset.runtime = getHostRuntime()
}
