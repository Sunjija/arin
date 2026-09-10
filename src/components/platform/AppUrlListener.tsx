import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { getAccountSyncPort } from '../../platform/accountSync'
import { parseDeepLink, toRouterLocation } from '../../platform/deepLinks'
import { isNativeRuntime } from '../../platform/runtime'

export function AppUrlListener() {
  const navigate = useNavigate()

  useEffect(() => {
    const port = getAccountSyncPort()

    const open = async (raw: string | undefined) => {
      const intent = parseDeepLink(raw)
      if (intent.kind === 'ignored') return
      if (intent.kind === 'auth-callback') {
        await port.completeFromCallback(intent.url)
        navigate('/', { replace: true })
        return
      }
      navigate(toRouterLocation(intent), { replace: true })
    }

    if (!isNativeRuntime()) return

    let remove: (() => void) | undefined
    void App.addListener('appUrlOpen', (event) => {
      void open(event.url)
    }).then((handle) => {
      remove = () => {
        void handle.remove()
      }
    })
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void open(launch.url)
    })

    return () => remove?.()
  }, [navigate])

  return null
}
