import { useContext, useEffect } from 'react'
import { FocusLayoutContext, type FocusLayoutContextValue } from './focusLayoutContext'

export function useFocusLayoutControl(): FocusLayoutContextValue {
  const ctx = useContext(FocusLayoutContext)
  if (!ctx) {
    throw new Error('useFocusLayoutControl는 FocusLayoutProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}

/**
 * 학습 실행·모의 시험 실행 중에만 true.
 * 준비/결과 화면은 false. 언마운트 시 셸이 복구된다.
 */
export function useFocusLayout(active: boolean): void {
  const { setFocused } = useFocusLayoutControl()
  useEffect(() => {
    setFocused(active)
    return () => setFocused(false)
  }, [active, setFocused])
}
