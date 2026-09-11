import { Button, InlineStatus } from '../ui'
import { SessionProgress } from '../SessionProgress'

export function StudyFocusHeader({
  onClose,
  closing = false,
  stepLabel,
  current,
  total,
  saveError,
}: {
  onClose: () => void
  closing?: boolean
  stepLabel: string
  current?: number
  total?: number
  saveError?: string | null
}) {
  const ratio =
    current != null && total != null && total > 0 ? Math.min(1, Math.max(0, current / total)) : 0

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-3">
        <Button variant="text" className="shrink-0 px-2" disabled={closing} onClick={onClose}>
          {closing ? '저장 중…' : '닫기'}
        </Button>
        <SessionProgress stepLabel={stepLabel} current={current} total={total} />
        {current != null && total != null && total > 0 ? (
          <div
            className="meter min-w-0 flex-1"
            role="progressbar"
            aria-label={`${stepLabel} 진행`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(current, total)}
          >
            <span style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
        ) : null}
      </div>
      {saveError ? <InlineStatus tone="error">{saveError}</InlineStatus> : null}
    </div>
  )
}
