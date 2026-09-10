import { useEffect, useState } from 'react'
import { getNetworkSnapshot, onNetworkChange } from '../../platform/lifecycle'

export function OfflineBanner() {
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    let alive = true
    void getNetworkSnapshot().then((status) => {
      if (alive) setConnected(status.connected)
    })
    const stop = onNetworkChange((status) => setConnected(status.connected))
    return () => {
      alive = false
      stop()
    }
  }, [])

  if (connected) return null

  return (
    <div className="offline-banner" role="status">
      네트워크가 끊겼습니다. 학습 기록은 기기에 남아 있고, 연결되면 이 안내가 사라집니다.
    </div>
  )
}
