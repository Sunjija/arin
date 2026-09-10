import { useEffect, useRef } from 'react'
import { pushBackGuard, type BackGuard } from './backButton'

export function useHardwareBack(active: boolean, guard: BackGuard): void {
  const guardRef = useRef(guard)

  useEffect(() => {
    guardRef.current = guard
  })

  useEffect(() => {
    if (!active) return
    return pushBackGuard(() => guardRef.current())
  }, [active])
}
