import { Button, InlineStatus } from '../ui'
export function StudyFocusHeader({ onClose, closing = false, stepLabel, current, total, saveError }: {
  onClose: () => void; closing?: boolean; stepLabel: string; current?: number; total?: number; saveError?: string | null
}) {
  const ratio = current != null && total ? Math.min(1, Math.max(0, current / total)) : 0
  return <header className="focus-header">
    <div className="focus-header-row">
      <Button variant="text" disabled={closing} onClick={onClose} aria-label={closing ? '저장 중' : '학습 닫기'}>
        {closing ? '저장 중…' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>}
      </Button>
      <strong>{stepLabel === '카드' ? '오늘 복습' : stepLabel === '문제' ? '개념 확인' : stepLabel}</strong>
      <span>{current != null && total != null ? `${current} / ${total}` : ''}</span>
    </div>
    {total != null && total > 0 && <div className="meter" role="progressbar" aria-label={`${stepLabel} 진행`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(current ?? 0, total)}><span style={{width: `${ratio * 100}%`}} /></div>}
    {saveError && <InlineStatus tone="error">{saveError}</InlineStatus>}
  </header>
}
