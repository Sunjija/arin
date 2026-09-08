import { createContext } from 'react'

export type FocusLayoutContextValue = {
  focused: boolean
  setFocused: (focused: boolean) => void
}

export const FocusLayoutContext = createContext<FocusLayoutContextValue | null>(null)
