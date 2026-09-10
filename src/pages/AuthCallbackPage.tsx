import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAccountSyncPort } from '../platform/accountSync'
import { InlineStatus } from '../components/ui'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('로그인 복귀 처리 중…')
  const [tone, setTone] = useState<'neutral' | 'success' | 'error'>('neutral')

  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}${window.location.hash}`
    void getAccountSyncPort()
      .completeFromCallback(url)
      .then((result) => {
        if (result.ok) {
          setTone('success')
          setMessage('테스트 로그인이 완료되었습니다. 오늘 화면으로 돌아갑니다.')
          window.setTimeout(() => navigate('/', { replace: true }), 600)
          return
        }
        setTone('error')
        setMessage(result.message ?? '로그인 복귀에 실패했습니다.')
      })
  }, [navigate, params])

  return (
    <div className="surface p-5">
      <h1 className="section-title">로그인 복귀</h1>
      <div className="mt-3">
        <InlineStatus tone={tone}>{message}</InlineStatus>
      </div>
    </div>
  )
}
