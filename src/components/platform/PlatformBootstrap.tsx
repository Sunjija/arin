import { type ReactNode, useEffect } from 'react'
import { bootPlatform } from '../../platform/boot'

export function PlatformBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    void bootPlatform().then((cleanup) => {
      if (cancelled) cleanup()
      else stop = cleanup
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])
  return children
}
