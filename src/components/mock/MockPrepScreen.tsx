import { Button, EmptyState, InlineStatus, PageHeader } from '../ui'
import type { ActiveMock } from '../../types'
import type { ScoreSummary } from '../../types/contracts'
import {
  FULL_LABEL,
  SAMPLE_LABEL,
  existingProgressCopy,
  fullMockAverageFromSummary,
  modeTitle,
  recentMocksForDisplay,
} from './mockExamLogic'

export function MockPrepScreen({
  selectedMode,
  onSelectMode,
  onStart,
  onResume,
  activeMock,
  summary,
  notice,
  busy,
  poolBlocked,
}: {
  selectedMode: 'sample' | 'full'
  onSelectMode: (mode: 'sample' | 'full') => void
  onStart: () => void
  onResume: () => void
  activeMock?: ActiveMock
  summary: ScoreSummary | null
  notice: string | null
  busy: boolean
  poolBlocked: boolean
}) {
  const recent = summary ? recentMocksForDisplay(summary) : []
  const average = summary ? fullMockAverageFromSummary(summary) : null
  const resumeFirst = Boolean(activeMock)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="실전" title="실전 연습">
        <p className="mt-2 text-[var(--ink-muted)]">
          제한 시간 안에 풀고, 끝나면 저장한 선지 그대로 채점합니다.
        </p>
      </PageHeader>

      {activeMock ? (
        <section className="surface surface-raised p-5">
          <h2 className="section-title">진행 중인 시험</h2>
          <p className="mt-2 text-[var(--ink-muted)]">{existingProgressCopy(activeMock)}</p>
          <Button className="mt-4 w-full sm:w-auto" onClick={onResume} disabled={busy}>
            이어서 풀기
          </Button>
        </section>
      ) : null}

      <section className="surface p-5">
        <h2 className="section-title">시작하기</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant={selectedMode === 'sample' ? 'primary' : 'secondary'}
            onClick={() => onSelectMode('sample')}
          >
            {SAMPLE_LABEL}
          </Button>
          <Button
            variant={selectedMode === 'full' ? 'primary' : 'secondary'}
            onClick={() => onSelectMode('full')}
          >
            {FULL_LABEL}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="metric-card">
            <p className="metric-label">문항</p>
            <p className="metric-value">{selectedMode === 'sample' ? 10 : 50}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">제한 시간</p>
            <p className="metric-value">{selectedMode === 'sample' ? 16 : 80}분</p>
          </div>
        </div>
        <p className="meta-text mt-3">배점은 문항마다 1·2·3점입니다. 비율은 로컬 출제 규칙입니다.</p>
        {poolBlocked && selectedMode === 'full' ? (
          <InlineStatus tone="error">
            고유 문항이 50개보다 적어 실전 연습을 시작할 수 없습니다. 10문항 연습을 이용해 주세요.
          </InlineStatus>
        ) : null}
        {notice ? <InlineStatus tone={poolBlocked ? 'error' : 'neutral'}>{notice}</InlineStatus> : null}
        <Button
          className="mt-4 w-full sm:w-auto"
          variant={resumeFirst ? 'secondary' : 'primary'}
          onClick={onStart}
          disabled={busy || (selectedMode === 'full' && poolBlocked)}
        >
          {resumeFirst ? `${modeTitle(selectedMode)} 새로 시작` : '시험 시작'}
        </Button>
      </section>

      <section className="surface p-5">
        <h2 className="section-title">최근 기록</h2>
        {recent.length === 0 ? (
          <EmptyState title="아직 기록 없음">첫 실전 연습 후 점수가 쌓여요.</EmptyState>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3">
                <span className="text-[var(--ink-muted)]">{modeTitle(item.mode)}</span>
                <span className="font-semibold tabular-nums">{item.score}점</span>
              </li>
            ))}
          </ul>
        )}
        <p className="meta-text mt-3">
          최근 실전 연습 평균{' '}
          {average == null ? '아직 기록 없음' : `${average}점`}
          {summary && summary.eligibleFullMockCount > 0
            ? ` · ${Math.min(3, summary.eligibleFullMockCount)}회`
            : null}
        </p>
      </section>
    </div>
  )
}
