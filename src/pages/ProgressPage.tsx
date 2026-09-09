import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { ArrowIcon } from '../components/DesignArtwork'
import { getProgressSnapshot } from '../lib/studyService'
import { db } from '../db/database'
import { practiceTrend } from '../lib/practiceTrend'
import { formatKoreanDate } from '../lib/dates'
import type { AttemptRecord, ProgressSnapshot } from '../types'

export function ProgressPage() {
  const [data, setData] = useState<ProgressSnapshot | null>(null)
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const [period, setPeriod] = useState<7 | 30>(7)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void Promise.all([getProgressSnapshot(), db.attempts.toArray()]).then(([snapshot, records]) => {
      if (alive) { setData(snapshot); setAttempts(records) }
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : '기록을 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [])
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p role="status">기록을 불러오는 중…</p>
  const trend = practiceTrend(attempts, period)
  const weak = data.weakAreas.filter(area => area.measured && area.accuracy != null && area.accuracy < 100)
  const summary = data.scoreSummary
  return <div className="progress-page">
    <PageHeader title="쌓이고 있는 실력"><p>내 기록을 바탕으로 다음 공부를 정합니다.</p></PageHeader>
    <div className="period-switch" role="group" aria-label="기록 기간">
      {([7, 30] as const).map(days => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)}>최근 {days}일</button>)}
    </div>
    <section aria-label="연습 문제 정답률">
      <p className="meta-text">연습 문제 정답률</p>
      <div className="flex items-center gap-6">
        {trend.accuracy == null ? <p className="accuracy-empty">아직 기록이 없어요</p> : <p className="accuracy-value">{trend.accuracy}<small>%</small></p>}
        {trend.difference != null && <div><span className={`pill ${trend.difference >= 0 ? 'green' : 'coral'}`}>{trend.difference > 0 ? '+' : ''}{trend.difference}%p</span><p className="meta-text mt-2">이전 {period}일 대비</p></div>}
      </div>
      <p className="meta-text">{trend.total ? `${trend.correct} / ${trend.total}문제 정답 · 모의고사 제외` : '연습 문제를 풀면 이곳에 변화가 쌓입니다.'}</p>
      <svg className="accuracy-chart" viewBox="0 0 400 165" role="img" aria-label={`최근 ${period}일 연습 정답률 추이. ${trend.buckets.map(b => `${b.label}: ${b.accuracy == null ? '기록 없음' : `${b.accuracy}% (${b.total}문제)`}`).join(', ')}`}>
        {[0, 50, 100].map(v => <g key={v}><line x1="38" x2="390" y1={125-v} y2={125-v} stroke="var(--line)" strokeDasharray="3 4" /><text x="28" y={129-v} fill="var(--ink-muted)" fontSize="10" textAnchor="end">{v}</text></g>)}
        {trend.buckets.map((bucket, i) => {
          const x = 48 + i * 342 / trend.buckets.length
          return <g key={bucket.from}>
            {bucket.accuracy != null ? <rect x={x+7} y={125-Math.max(2,bucket.accuracy)} width="23" height={Math.max(2,bucket.accuracy)} rx="5" fill={i === trend.buckets.length-1 ? 'var(--accent)' : '#EEC4B8'} /> : <text x={x+18} y="119" textAnchor="middle" fontSize="11" fill="var(--ink-muted)">—</text>}
            <text x={x+18} y="148" textAnchor="middle" fontSize="10" fill="var(--ink-muted)">{Number(bucket.to.slice(5,7))}/{Number(bucket.to.slice(8))}</text>
          </g>
        })}
      </svg>
      <p className="meta-text text-right">{period === 30 ? '5일 단위 집계 · ' : ''}— 기록 없음</p>
    </section>
    <section className="flat-section mt-5">
      <h2>지금 보완하면 좋은 개념</h2><p className="meta-text mt-2">전체 풀이 기록 기준</p>
      {weak.length ? weak.slice(0, 4).map((area, index) => <div className="weak-row" key={`${area.kind}-${area.key}`}>
        <span>{String(index+1).padStart(2, '0')}</span><div><h3>{area.label}</h3><p>{area.attemptCount}문제 · 정답률 {area.accuracy}%</p></div>
        <Link className="touch-target" to={area.kind === 'era' ? `/library?tab=concepts&era=${area.key}` : '/cards'} aria-label={`${area.label} 보완 학습`}><ArrowIcon /></Link>
      </div>) : <p className="meta-text mt-5">{attempts.length ? '현재 보완이 필요한 영역이 없습니다.' : '풀이 기록이 쌓이면 보완할 영역을 알려드려요.'}</p>}
    </section>
    <section className="flat-section">
      <h2>실전 연습 기록</h2>
      <p className="meta-text mt-3">최근 실전 평균 {summary.fullMockAverage == null ? '아직 기록 없음' : `${summary.fullMockAverage}점 · 최근 ${Math.min(3,summary.eligibleFullMockCount)}회`}</p>
      {summary.recentMocks.length ? summary.recentMocks.slice(0,5).map(mock => <div className="exam-record" key={mock.id}>
        <div><span>{formatKoreanDate(mock.createdAt.slice(0,10))}</span><p>{mock.total}문항 · {mock.eligibleForFullStats ? '실전 평균 포함' : '실전 평균 제외'}</p></div><strong>{mock.score}<small>점</small></strong>
      </div>) : <Link className="btn btn-secondary mt-4" to="/mock">첫 실전 연습 시작</Link>}
    </section>
  </div>
}
