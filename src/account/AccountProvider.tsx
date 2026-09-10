import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccountContext, type AccountContextValue } from './AccountContext'
import { createDemoAdapters, createHttpAdapters } from './adapters'
import { installLearningCapture, setCaptureContext } from './capture'
import { readAccountMode } from './config'
import { newDeviceId, newGuestDeviceId } from './eventId'
import {
  clearConflicts,
  clearOwnerOutbox,
  deleteWorkspace,
  failedOutbox,
  kvDelete,
  kvGet,
  kvSet,
  listConflicts,
  pendingOutbox,
} from './outbox'
import { statusCopy } from './statusCopy'
import {
  flushOutbox,
  loginWithAdapters,
  parkCurrentUser,
  pullAndApply,
  registerWithAdapters,
  resolveConflictKeepLocal,
  resolveConflictTakeServer,
} from './syncEngine'
import { AccountError, guestSession, type AccountUiState, type AuthSessionView, type SyncConflict } from './types'
import { replaceWithSeededGuest } from './workspace'

const emptyState = (session: AuthSessionView): AccountUiState => ({
  session,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  lastError: null,
  ...statusCopy({ session, pendingCount: 0, failedCount: 0, conflictCount: 0, lastError: null }),
})

export function AccountProvider({ children }: { children: ReactNode }) {
  installLearningCapture()
  const mode = readAccountMode()
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AccountUiState>(() => emptyState(guestSession(mode, false)))
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])

  const refreshCounts = useCallback(async (session: AuthSessionView, lastError: string | null = null) => {
    const ownerKey = session.userId ?? 'guest'
    const pending = await pendingOutbox(ownerKey)
    const failed = await failedOutbox(ownerKey)
    const currentConflicts = await listConflicts()
    setConflicts(currentConflicts)
    const next = statusCopy({
      session,
      pendingCount: pending.length,
      failedCount: failed.length,
      conflictCount: currentConflicts.length,
      lastError,
    })
    setState({
      session,
      pendingCount: pending.length,
      failedCount: failed.length,
      conflictCount: currentConflicts.length,
      lastError,
      ...next,
    })
  }, [])

  useEffect(() => {
    let alive = true
    const boot = async () => {
      let guestDeviceId = await kvGet<string>('guestDeviceId')
      if (!guestDeviceId) {
        guestDeviceId = newGuestDeviceId()
        await kvSet('guestDeviceId', guestDeviceId)
      }
      let deviceId = await kvGet<string>('deviceId')
      if (!deviceId) {
        deviceId = newDeviceId()
        await kvSet('deviceId', deviceId)
      }
      const ownerKey = (await kvGet<string>('ownerKey')) ?? 'guest'
      await kvSet('ownerKey', ownerKey)

      if (mode !== 'connected') {
        setCaptureContext({ ownerKey, deviceId, mode, signedIn: false })
        await refreshCounts(guestSession('demo', false))
        if (alive) setReady(true)
        return
      }

      const { auth, sync } = createHttpAdapters({
        getToken: () => kvGet<string>('sessionSecret').then((value) => value ?? null),
        setToken: async (token) => {
          if (token) await kvSet('sessionSecret', token)
          else await kvDelete('sessionSecret')
        },
      })
      const reachable = await sync.health()
      const session = reachable ? await auth.session() : guestSession('connected', false)
      const signedIn = session.status === 'signed-in'
      const nextOwner = session.userId ?? 'guest'
      await kvSet('ownerKey', nextOwner)
      setCaptureContext({ ownerKey: nextOwner, deviceId, mode: 'connected', signedIn })
      if (signedIn && reachable) {
        try {
          await flushOutbox(nextOwner, sync)
          await pullAndApply(nextOwner, sync)
        } catch (error) {
          await refreshCounts(session, error instanceof Error ? error.message : '동기화 실패')
          if (alive) setReady(true)
          return
        }
      }
      await refreshCounts({ ...session, serverReachable: reachable, mode: 'connected' })
      if (alive) setReady(true)
    }
    void boot()
    return () => {
      alive = false
    }
  }, [mode, refreshCounts])

  const connectedAdapters = useCallback(() => {
    return createHttpAdapters({
      getToken: () => kvGet<string>('sessionSecret').then((value) => value ?? null),
      setToken: async (token) => {
        if (token) await kvSet('sessionSecret', token)
        else await kvDelete('sessionSecret')
      },
    })
  }, [])

  const ids = useCallback(async () => {
    const guestDeviceId = (await kvGet<string>('guestDeviceId')) ?? newGuestDeviceId()
    const deviceId = (await kvGet<string>('deviceId')) ?? newDeviceId()
    await kvSet('guestDeviceId', guestDeviceId)
    await kvSet('deviceId', deviceId)
    return { guestDeviceId, deviceId }
  }, [])

  const register = useCallback(
    async (input: { email: string; password: string; ageConfirmed: boolean }) => {
      if (mode !== 'connected') throw new AccountError('demo_mode', '데모 모드에서는 서버 계정을 만들지 않습니다.')
      const { auth, sync } = connectedAdapters()
      const { guestDeviceId, deviceId } = await ids()
      const session = await registerWithAdapters({
        auth,
        transport: sync,
        guestDeviceId,
        deviceId,
        email: input.email,
        password: input.password,
        ageConfirmed: input.ageConfirmed,
      })
      setCaptureContext({ ownerKey: session.userId ?? 'guest', deviceId, mode: 'connected', signedIn: true })
      await refreshCounts(session)
    },
    [connectedAdapters, ids, mode, refreshCounts],
  )

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      if (mode !== 'connected') throw new AccountError('demo_mode', '데모 모드에서는 로그인할 수 없습니다.')
      const { auth, sync } = connectedAdapters()
      const { guestDeviceId, deviceId } = await ids()
      const currentOwnerKey = (await kvGet<string>('ownerKey')) ?? 'guest'
      const session = await loginWithAdapters({
        auth,
        transport: sync,
        guestDeviceId,
        deviceId,
        email: input.email,
        password: input.password,
        currentOwnerKey,
      })
      setCaptureContext({ ownerKey: session.userId ?? 'guest', deviceId, mode: 'connected', signedIn: true })
      await refreshCounts(session)
    },
    [connectedAdapters, ids, mode, refreshCounts],
  )

  const logout = useCallback(async () => {
    const { auth, sync } = mode === 'connected' ? connectedAdapters() : createDemoAdapters()
    const ownerKey = (await kvGet<string>('ownerKey')) ?? 'guest'
    if (mode === 'connected' && ownerKey !== 'guest') {
      try {
        await flushOutbox(ownerKey, sync)
      } catch {
        await parkCurrentUser(ownerKey)
      }
      await parkCurrentUser(ownerKey)
    }
    await auth.logout()
    await kvDelete('sessionSecret')
    await kvSet('ownerKey', 'guest')
    const { deviceId } = await ids()
    setCaptureContext({ ownerKey: 'guest', deviceId, mode, signedIn: false })
    await replaceWithSeededGuest()
    await refreshCounts(guestSession(mode, mode === 'connected'))
  }, [connectedAdapters, ids, mode, refreshCounts])

  const deleteAccount = useCallback(
    async (password: string) => {
      if (mode !== 'connected') throw new AccountError('demo_mode', '데모 모드에서는 탈퇴할 수 없습니다.')
      const { auth } = connectedAdapters()
      const ownerKey = (await kvGet<string>('ownerKey')) ?? 'guest'
      await auth.deleteAccount({ password })
      if (ownerKey !== 'guest') {
        await clearOwnerOutbox(ownerKey)
        await deleteWorkspace(ownerKey)
      }
      await kvDelete('sessionSecret')
      await kvSet('ownerKey', 'guest')
      await clearConflicts()
      await replaceWithSeededGuest()
      const { deviceId } = await ids()
      setCaptureContext({ ownerKey: 'guest', deviceId, mode: 'connected', signedIn: false })
      await refreshCounts(guestSession('connected', true))
    },
    [connectedAdapters, ids, mode, refreshCounts],
  )

  const startRecovery = useCallback(
    async (email: string) => {
      if (mode !== 'connected') throw new AccountError('demo_mode', '데모 모드에서는 복구할 수 없습니다.')
      const { auth } = connectedAdapters()
      const result = await auth.startRecovery(email)
      return result.devRecoveryToken
    },
    [connectedAdapters, mode],
  )

  const completeRecovery = useCallback(
    async (input: { token: string; newPassword: string }) => {
      if (mode !== 'connected') throw new AccountError('demo_mode', '데모 모드에서는 복구할 수 없습니다.')
      const { auth } = connectedAdapters()
      await auth.completeRecovery(input)
    },
    [connectedAdapters, mode],
  )

  const syncNow = useCallback(async () => {
    if (mode !== 'connected' || state.session.status !== 'signed-in' || !state.session.userId) return
    const { sync } = connectedAdapters()
    await flushOutbox(state.session.userId, sync)
    await pullAndApply(state.session.userId, sync)
    await refreshCounts(state.session)
  }, [connectedAdapters, mode, refreshCounts, state.session])

  const keepLocal = useCallback(
    async (eventId: string) => {
      if (!state.session.userId) return
      const { sync } = connectedAdapters()
      await resolveConflictKeepLocal(state.session.userId, sync, eventId)
      await refreshCounts(state.session)
    },
    [connectedAdapters, refreshCounts, state.session],
  )

  const takeServer = useCallback(
    async (eventId: string) => {
      const conflict = conflicts.find((item) => item.id === eventId)
      if (!conflict) return
      await resolveConflictTakeServer(eventId, conflict.server, conflict.collection)
      await refreshCounts(state.session)
    },
    [conflicts, refreshCounts, state.session],
  )

  const value = useMemo<AccountContextValue>(
    () => ({
      state,
      conflicts,
      ready,
      register,
      login,
      logout,
      deleteAccount,
      startRecovery,
      completeRecovery,
      syncNow,
      keepLocal,
      takeServer,
    }),
    [
      completeRecovery,
      conflicts,
      deleteAccount,
      keepLocal,
      login,
      logout,
      ready,
      register,
      startRecovery,
      state,
      syncNow,
      takeServer,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
