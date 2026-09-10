import { useCallback, useEffect, useState } from 'react'
import { getAccountSyncPort, type AccountSession } from '../../platform/accountSync'
import { authCallbackUri } from '../../platform/identity'
import { isDemoMode, runtimeBannerLabel } from '../../platform/env'
import { getHostRuntime } from '../../platform/runtime'

export function RuntimeBanner() {
  const [session, setSession] = useState<AccountSession | null>(null)
  const [busy, setBusy] = useState(false)
  const port = getAccountSyncPort()

  const refresh = useCallback(() => {
    void port.getSession().then(setSession)
  }, [port])

  useEffect(() => {
    refresh()
  }, [refresh])

  const host = getHostRuntime()
  const demo = isDemoMode()

  return (
    <div className={`runtime-banner${demo ? ' is-demo' : ' is-live'}`} role="status">
      <p>
        <strong>{runtimeBannerLabel()}</strong>
        <span className="runtime-banner-meta">
          {host === 'web' ? '브라우저' : host === 'android' ? 'Android 앱' : 'iOS 앱'}
          {session ? ` · ${session.displayName ?? session.localId}` : ' · 로그인 없음'}
        </span>
      </p>
      <div className="runtime-banner-actions">
        {session ? (
          <button
            type="button"
            className="runtime-banner-btn"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void port.signOut().finally(() => {
                setBusy(false)
                refresh()
              })
            }}
          >
            테스트 로그아웃
          </button>
        ) : (
          <button
            type="button"
            className="runtime-banner-btn"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void port
                .startExternalLogin({ redirectUri: authCallbackUri() })
                .finally(() => {
                  setBusy(false)
                  refresh()
                })
            }}
          >
            테스트 로그인
          </button>
        )}
      </div>
    </div>
  )
}
