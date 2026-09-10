import { useState } from 'react'
import { Button, Dialog, InlineStatus } from '../components/ui'
import { useAccount } from './AccountContext'
import { AccountError } from './types'

export function AccountPanel() {
  const { state, conflicts, ready, register, login, logout, deleteAccount, startRecovery, completeRecovery, syncNow, keepLocal, takeServer } =
    useAccount()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [devToken, setDevToken] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await fn()
    } catch (caught) {
      setError(caught instanceof AccountError || caught instanceof Error ? caught.message : '요청에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <section className="surface p-5">
        <h2 className="section-title">계정</h2>
        <p className="meta-text mt-2">계정 상태를 확인하는 중…</p>
      </section>
    )
  }

  const demo = state.session.mode === 'demo'

  return (
    <section className="surface p-5">
      <h2 className="section-title">계정과 동기화</h2>
      <InlineStatus tone={state.statusTone}>{state.statusText}</InlineStatus>
      {state.session.emailMasked ? (
        <p className="meta-text mt-2">로그인됨: {state.session.emailMasked}</p>
      ) : (
        <p className="meta-text mt-2">게스트로 이 브라우저에서 학습 중입니다.</p>
      )}
      {state.session.entitlement.plan === 'paid' ? (
        <p className="meta-text mt-1">이용 권한: 결제 서버가 연결한 유료</p>
      ) : (
        <p className="meta-text mt-1">이용 권한: 무료(클라이언트에서 바꾸지 않습니다)</p>
      )}

      {demo ? (
        <p className="mt-3 leading-relaxed text-[var(--ink-muted)]">
          기본 <code>npm run dev</code>는 서버 없이 미리보기합니다. 계정 저장을 시험하려면{' '}
          <code>npm run dev:account</code>로 실행하세요.
        </p>
      ) : null}

      {state.session.status !== 'signed-in' && !demo ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await login({ email, password })
              setPassword('')
              setMessage('로그인했습니다. 게스트 기록이 있으면 이 계정으로 옮깁니다.')
            })
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-semibold">이메일</span>
            <input
              className="field-control"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">비밀번호</span>
            <input
              className="field-control"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
            />
            <span>만 14세 이상입니다. 가입할 때만 필요합니다.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              로그인
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !ageConfirmed}
              onClick={() =>
                void run(async () => {
                  await register({ email, password, ageConfirmed })
                  setPassword('')
                  setMessage('가입했습니다. 이 브라우저의 게스트 기록을 계정으로 옮깁니다.')
                })
              }
            >
              회원가입
            </Button>
            <Button type="button" variant="text" disabled={busy} onClick={() => setRecoveryOpen(true)}>
              비밀번호 찾기
            </Button>
          </div>
        </form>
      ) : null}

      {state.session.status === 'signed-in' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void run(syncNow)}>
            지금 동기화
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void run(logout)}>
            로그아웃
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => setDeleteOpen(true)}>
            계정 삭제
          </Button>
        </div>
      ) : null}

      {conflicts.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="font-semibold">진행 중 기록 충돌</p>
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-[var(--radius-card)] border border-[var(--line)] p-3">
              <p className="meta-text">
                {conflict.collection === 'activeMock' ? '진행 중 시험' : '진행 중 학습'}이 다른 기기와 다릅니다. 한쪽을
                선택하세요.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void keepLocal(conflict.id)}>
                  이 기기 기록 유지
                </Button>
                <Button type="button" variant="secondary" onClick={() => void takeServer(conflict.id)}>
                  다른 기기 기록 가져오기
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <InlineStatus tone="success">{message}</InlineStatus> : null}
      {error ? <InlineStatus tone="error">{error}</InlineStatus> : null}

      <Dialog open={deleteOpen} title="계정 삭제" onClose={() => setDeleteOpen(false)}>
        <p className="leading-relaxed">
          서버의 학습 동기화 기록을 지우고 이 기기 캐시도 비웁니다. 결제 원장의 보관·삭제는 결제 담당이 별도로 처리합니다.
          보관 기간은 여기서 정하지 않습니다.
        </p>
        <label className="mt-4 block space-y-1">
          <span className="text-sm font-semibold">비밀번호 재확인</span>
          <input
            className="field-control"
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await deleteAccount(deletePassword)
                setDeleteOpen(false)
                setDeletePassword('')
                setMessage('계정을 삭제하고 이 기기를 게스트로 되돌렸습니다.')
              })
            }
          >
            삭제
          </Button>
          <Button variant="text" onClick={() => setDeleteOpen(false)}>
            취소
          </Button>
        </div>
      </Dialog>

      <Dialog open={recoveryOpen} title="비밀번호 복구" onClose={() => setRecoveryOpen(false)}>
        <p className="leading-relaxed">
          개발 환경에서는 메일 대신 복구 토큰을 발급할 수 있습니다. 실제 메일 발송은 연결되어 있지 않습니다.
        </p>
        <label className="mt-3 block space-y-1">
          <span className="text-sm font-semibold">이메일</span>
          <input
            className="field-control"
            type="email"
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
          />
        </label>
        <Button
          className="mt-3"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const token = await startRecovery(recoveryEmail)
              setDevToken(token ?? null)
              setMessage('해당 이메일이 가입되어 있으면 복구 안내를 보냅니다.')
            })
          }
        >
          복구 요청
        </Button>
        {devToken ? (
          <p className="meta-text mt-2">개발용 토큰이 응답에 포함되었습니다. 로그에는 남기지 않습니다.</p>
        ) : null}
        {devToken ? (
          <label className="mt-3 block space-y-1">
            <span className="text-sm font-semibold">개발용 토큰</span>
            <input className="field-control" value={devToken} readOnly />
          </label>
        ) : null}
        <label className="mt-3 block space-y-1">
          <span className="text-sm font-semibold">복구 토큰</span>
          <input
            className="field-control"
            value={recoveryToken}
            onChange={(event) => setRecoveryToken(event.target.value)}
          />
        </label>
        <label className="mt-3 block space-y-1">
          <span className="text-sm font-semibold">새 비밀번호</span>
          <input
            className="field-control"
            type="password"
            value={recoveryPassword}
            onChange={(event) => setRecoveryPassword(event.target.value)}
          />
        </label>
        <Button
          className="mt-3"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await completeRecovery({ token: recoveryToken || devToken || '', newPassword: recoveryPassword })
              setRecoveryOpen(false)
              setMessage('비밀번호를 바꿨습니다. 새 비밀번호로 로그인하세요.')
            })
          }
        >
          비밀번호 바꾸기
        </Button>
      </Dialog>
    </section>
  )
}
