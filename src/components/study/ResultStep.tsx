import { Link } from 'react-router-dom'
import { sessionAnswerStats } from '../../lib/studyService'
import type { ActiveSession } from '../../types'

export function ResultStep({ session, lessonTitle }: { session: ActiveSession; lessonTitle: string }) {
  const stats = sessionAnswerStats(session.answered)
  const review = session.entryMode === 'review'

  return (
    <div className="surface space-y-4 p-5">
      <h1 className="font-display text-2xl">{review ? '복습 결과' : '오늘 학습 결과'}</h1>
      <p className="meta-text">{review ? '카드 복습만 진행했습니다.' : lessonTitle}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="metric-card">
          <p className="metric-label">복습 카드</p>
          <p className="metric-value">{session.cardIds.length}장</p>
        </div>
        {review ? (
          <div className="metric-card">
            <p className="metric-label">다음</p>
            <p className="metric-value text-xl">복습 목록</p>
          </div>
        ) : (
          <div className="metric-card">
            <p className="metric-label">문제 정답률</p>
            <p className="metric-value">{stats.accuracy}%</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {stats.correct}/{stats.total}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {review ? (
          <>
            <Link to="/cards" className="btn btn-primary">
              복습 목록으로
            </Link>
            <Link to="/" className="btn btn-secondary">
              오늘 화면
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className="btn btn-primary">
              오늘 화면
            </Link>
            <Link to="/cards" className="btn btn-secondary">
              오답·카드 보기
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
