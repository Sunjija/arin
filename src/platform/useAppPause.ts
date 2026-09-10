import { useEffect, useRef } from 'react'
import { onPause, onResume } from './lifecycle'

export function useAppPause(onHidden: () => void, onVisible?: () => void): void {
  const hiddenRef = useRef(onHidden)
  const visibleRef = useRef(onVisible)

  useEffect(() => {
    hiddenRef.current = onHidden
    visibleRef.current = onVisible
  })

  useEffect(() => {
    const stopPause = onPause(() => hiddenRef.current())
    const stopResume = onResume(() => {
      visibleRef.current?.()
    })
    return () => {
      stopPause()
      stopResume()
    }
  }, [])
}
