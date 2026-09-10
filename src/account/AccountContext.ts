import { createContext, useContext } from 'react'
import type { AccountUiState, SyncConflict } from './types'

export interface AccountContextValue {
  state: AccountUiState
  conflicts: SyncConflict[]
  ready: boolean
  register: (input: { email: string; password: string; ageConfirmed: boolean }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  startRecovery: (email: string) => Promise<string | undefined>
  completeRecovery: (input: { token: string; newPassword: string }) => Promise<void>
  syncNow: () => Promise<void>
  keepLocal: (eventId: string) => Promise<void>
  takeServer: (eventId: string) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

export { AccountContext }

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('AccountProvider가 필요합니다.')
  return value
}
