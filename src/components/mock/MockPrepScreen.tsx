import { formatKoreanDate } from '../../lib/dates'
import { Button, EmptyState, InlineStatus, PageHeader } from '../ui'
import type { ActiveMock } from '../../types'
import type { ScoreSummary } from '../../types/contracts'
import {
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
    <div className="mock-prep space-y-5">
      <PageHeader title="실전 감각을 키워요">
        <p className="mt-2 text-[var(--ink-muted)]">
          정해진 시간 안에서 흐름을 점검합니다.
        </p>
      </PageHeader>

      <div className="exam-hero"><p>한국사 심화</p><h2>연습이 쌓이면,<br />실전은 익숙해집니다.</h2></div>

      {activeMock ? (
        <section className="surface surface-raised p-5">
          <h2 className="section-title">진행 중인 시험</h2>
          <p className="mt-2 text-[var(--ink-muted)]">{existingProgressCopy(activeMock)}</p>
          <Button className="mt-4 w-full sm:w-auto" onClick={onResume} disabled={busy}>
            이어서 풀기
          </Button>
        </section>
      ) : null}

      <section className="flat-section">
        <h2 className="section-title">오늘의 연습 방식</h2>
        <div className="space-y-3 mt-4">
          {(['sample', 'full'] as const).map(mode => <button type="button" key={mode} className="exam-mode" aria-pressed={selectedMode === mode} onClick={() => onSelectMode(mode)}>
            <span className="mode-radio" aria-hidden="true" /><span><strong>{mode === 'sample' ? '10문항 연습' : '50문항 실전'}</strong><small>{mode === 'sample' ? '16분 · 가볍게 실력 확인' : '80분 · 실제 시험처럼 집중'}</small></span>
          </button>)}
        </div>
        <p className="meta-text mt-4">10문항 연습 결과는 실전 평균에서 제외됩니다.</p>
        {poolBlocked && selectedMode === 'full' ? (
          <InlineStatus tone="error">
            고유 문항이 50개보다 적어 실전 연습을 시작할 수 없습니다. 10문항 연습을 이용해 주세요.
          </InlineStatus>
        ) : null}
        {notice ? <InlineStatus tone={poolBlocked ? 'error' : 'neutral'}>{notice}</InlineStatus> : null}
        <Button
          className="hero-cta"
          variant={resumeFirst ? 'secondary' : 'primary'}
          onClick={onStart}
          disabled={busy || (selectedMode === 'full' && poolBlocked)}
        >
          {resumeFirst ? `${modeTitle(selectedMode)} 새로 시작` : selectedMode === 'sample' ? '10문항 연습 시작' : '50문항 실전 시작'}
        </Button>
      </section>

      <section className="flat-section">
        <h2 className="section-title">최근 실전 기록</h2>
        {recent.length === 0 ? (
          <EmptyState title="아직 기록 없음">첫 실전 연습 후 점수가 쌓여요.</EmptyState>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((item) => (
              <li key={item.id} className="exam-record"><div><span>{formatKoreanDate(item.createdAt.slice(0, 10))}</span><p>{modeTitle(item.mode)} · {item.total}문항</p></div><strong>{item.score}<small>점</small></strong></li>
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
