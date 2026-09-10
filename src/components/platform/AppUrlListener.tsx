import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { getAccountSyncPort } from '../../platform/accountSync'
import { parseDeepLink, toRouterLocation } from '../../platform/deepLinks'
import { consumeLaunchUrlOnce, markNativeUrlHandled } from '../../platform/launchUrl'
import { isNativeRuntime } from '../../platform/runtime'

export function AppUrlListener() {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)

  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    if (!isNativeRuntime()) return

    const open = async (raw: string | undefined) => {
      const intent = parseDeepLink(raw)
      if (intent.kind === 'ignored') return
      if (intent.kind === 'auth-callback') {
        await getAccountSyncPort().completeFromCallback(intent.url)
        navigateRef.current('/', { replace: true })
        return
      }
      navigateRef.current(toRouterLocation(intent), { replace: true })
    }

    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined

    void App.addListener('appUrlOpen', (event) => {
      markNativeUrlHandled()
      void open(event.url)
    }).then((value) => {
      if (cancelled) {
        void value.remove()
        return
      }
      handle = value
    })

    void App.getLaunchUrl().then((launch) => {
      if (cancelled) return
      const url = consumeLaunchUrlOnce(launch?.url)
      if (url) void open(url)
    })

    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [])

  return null
}
