import type { AccountUiState, AuthSessionView } from './types'

export function statusCopy(input: {
  session: AuthSessionView
  pendingCount: number
  failedCount: number
  conflictCount: number
  lastError: string | null
}): Pick<AccountUiState, 'statusText' | 'statusTone'> {
  if (input.session.mode === 'demo') {
    return { statusText: '데모 모드 · 이 브라우저에만 저장됩니다. 서버에 올리지 않습니다.', statusTone: 'neutral' }
  }
  if (!input.session.serverReachable) {
    return { statusText: '개발 서버에 연결하지 못했습니다. 로컬 학습은 계속할 수 있습니다.', statusTone: 'error' }
  }
  if (input.conflictCount > 0) {
    return { statusText: '다른 기기와 진행 중 기록이 충돌했습니다. 덮어쓰지 않고 선택을 기다립니다.', statusTone: 'error' }
  }
  if (input.failedCount > 0) {
    return { statusText: '서버 저장 실패 · 연결되면 다시 보냅니다.', statusTone: 'error' }
  }
  if (input.pendingCount > 0) {
    return { statusText: '서버 저장 대기 중', statusTone: 'neutral' }
  }
  if (input.session.status === 'signed-in') {
    return { statusText: '개발 서버에 연결됨 · 서버에 저장됨', statusTone: 'success' }
  }
  return { statusText: '개발 서버에 연결됨 · 로그인하면 다른 기기와 동기화합니다.', statusTone: 'neutral' }
}
