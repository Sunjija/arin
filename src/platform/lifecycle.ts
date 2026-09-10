import { App } from '@capacitor/app'
import { Network } from '@capacitor/network'
import { isNativeRuntime } from './runtime'

export type AppLifecycleState = {
  isActive: boolean
  source: 'native' | 'web'
}

export type NetworkSnapshot = {
  connected: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

export type PlatformUnsubscribe = () => void

function webNetwork(): NetworkSnapshot {
  const connected = typeof navigator === 'undefined' ? true : navigator.onLine
  return { connected, connectionType: connected ? 'unknown' : 'none' }
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  if (!isNativeRuntime()) return webNetwork()
  const status = await Network.getStatus()
  return {
    connected: status.connected,
    connectionType: status.connectionType,
  }
}

function listenNative(
  add: () => Promise<{ remove: () => Promise<void> }>,
): PlatformUnsubscribe {
  let cancelled = false
  let handle: { remove: () => Promise<void> } | undefined
  void add().then((value) => {
    if (cancelled) {
      void value.remove()
      return
    }
    handle = value
  })
  return () => {
    cancelled = true
    void handle?.remove()
  }
}

export function onAppStateChange(listener: (state: AppLifecycleState) => void): PlatformUnsubscribe {
  if (isNativeRuntime()) {
    return listenNative(() =>
      App.addListener('appStateChange', ({ isActive }) => {
        listener({ isActive, source: 'native' })
      }),
    )
  }

  const onVisibility = () => {
    listener({ isActive: document.visibilityState === 'visible', source: 'web' })
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}

export function onPause(listener: () => void): PlatformUnsubscribe {
  if (isNativeRuntime()) {
    return listenNative(() => App.addListener('pause', listener))
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') listener()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}

export function onResume(listener: () => void): PlatformUnsubscribe {
  if (isNativeRuntime()) {
    return listenNative(() => App.addListener('resume', listener))
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') listener()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}

export function onNetworkChange(listener: (status: NetworkSnapshot) => void): PlatformUnsubscribe {
  if (isNativeRuntime()) {
    return listenNative(() =>
      Network.addListener('networkStatusChange', (status) => {
        listener({
          connected: status.connected,
          connectionType: status.connectionType,
        })
      }),
    )
  }
  const emit = () => listener(webNetwork())
  window.addEventListener('online', emit)
  window.addEventListener('offline', emit)
  return () => {
    window.removeEventListener('online', emit)
    window.removeEventListener('offline', emit)
  }
}
