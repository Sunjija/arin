import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { ArrowIcon } from '../components/DesignArtwork'
import { getProgressSnapshot } from '../lib/studyService'
import { db } from '../db/database'
import { practiceTrend } from '../lib/practiceTrend'
import { formatKoreanDate, toDateKey } from '../lib/dates'
import { getGoal } from '../lib/learningApi'
import { catalogConcepts } from '../lib/conceptCatalog'
import { progressSummary } from '../lib/progressSummary'

async function readProgress() {
  const [snapshot, attempts, goal, progress, session] = await Promise.all([
    getProgressSnapshot(), db.attempts.toArray(), getGoal(),
    db.conceptProgress.toArray(), db.activeSession.toCollection().first(),
  ])
  return { snapshot, attempts, goal, ...progressSummary({ today: toDateKey(), goal, concepts: catalogConcepts(), progress, session }) }
}

export function ProgressPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof readProgress>> | null>(null)
  const [period, setPeriod] = useState<7 | 30>(7)
  const [error, setError] = useState(false)
  const [request, setRequest] = useState(0)
  useEffect(() => {
    let alive = true
    void readProgress().then(result => {
      if (alive) setData(result)
    }).catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [request])
  if (error) return <div className="progress-page">
    <p role="alert">학습 기록을 불러오지 못했습니다. 다시 불러와 주세요.</p>
    <button className="btn btn-secondary mt-4" type="button" onClick={() => { setError(false); setData(null); setRequest(value => value + 1) }}>기록 다시 불러오기</button>
  </div>
  if (!data) return <p role="status">기록을 불러오는 중…</p>
  const { attempts, snapshot, goal, schedule, session } = data
  const trend = practiceTrend(attempts, period)
  const weak = snapshot.weakAreas.filter(area => area.measured && area.accuracy != null && area.accuracy < 100)
  const summary = snapshot.scoreSummary
  return <div className="progress-page min-w-0 break-words">
    <PageHeader title="내 학습 기록"><p>완료한 개념과 저장된 풀이 기록을 확인합니다.</p></PageHeader>
    <section className="flat-section" aria-labelledby="concept-progress-title">
      <h2 id="concept-progress-title">목표 대비 개념 진도</h2>
      <p className="mt-3">학습 완료 <strong>{schedule.completedConcepts} / {schedule.totalConcepts}개</strong> · 남은 개념 {schedule.remainingConcepts}개</p>
      <p className="meta-text mt-2">현재 개념 목록 기준입니다. 열람·학습 중 기록과 구형 단원 완료는 개념 완료로 세지 않습니다.</p>
      <dl className="grid gap-3 mt-4">
        <div><dt>개념 완주 목표일</dt><dd>{schedule.targetDate}</dd></div>
        <div><dt>시험일</dt><dd>{goal.examDateUndecided || !goal.examDate ? '미정' : goal.examDate}</dd></div>
        <div><dt>남은 개념의 상세 설명</dt><dd>준비됨 {schedule.readyRemainingConcepts}개 · 준비 중 {schedule.unavailableConcepts}개</dd></div>
        <div><dt>목표일까지 남은 학습일</dt><dd>{schedule.studyDaysLeft}일</dd></div>
      </dl>
      <p className="meta-text mt-3">개념 목록과 설명 준비 수는 공식 시험 범위의 충족이나 숙달을 뜻하지 않습니다.</p>
      {schedule.warnings.length > 0 && <ul className="grid gap-2 mt-3" aria-label="목표와 콘텐츠 안내">{schedule.warnings.map(warning => <li className="meta-text" key={warning}>{warning}</li>)}</ul>}
      <Link className="btn btn-secondary mt-4" to="/settings">학습 목표 확인</Link>
    </section>
    <section className="flat-section" aria-labelledby="saved-session-title">
      <h2 id="saved-session-title">저장된 완료 학습의 풀이 구분</h2>
      <p className="meta-text mt-2">현재 저장된 학습 1회 기준입니다. 전체 이력이나 최근 7·30일 합계가 아닙니다.</p>
      {session.status === 'missing' ? <p className="mt-3">저장된 학습이 없습니다.</p>
        : session.status === 'in-progress' ? <p className="mt-3">현재 저장된 학습은 진행 중입니다. 완료 후 풀이 구분을 보여드립니다.</p>
          : <>
            <p className="meta-text mt-3">마지막 저장 날짜: {session.savedOn ?? '확인할 수 없음'}</p>
            {session.total === 0 ? <p className="mt-3">이 완료 학습에는 제출한 문제 기록이 없습니다. 카드만 복습한 학습도 여기에 해당합니다.</p>
              : <dl className="grid gap-3 mt-4">{([
                ['first', '첫 풀이'], ['repeated', '다시 풀이'], ['unknown', '구분 정보 없음'],
              ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{session.stats[key].total ? `정답 ${session.stats[key].correct}개 / ${session.stats[key].total}문항` : '문제 기록 없음'}</dd></div>)}</dl>}
          </>}
      <p className="meta-text mt-3">첫 풀이는 학습 시작 전 동일 문항의 저장된 답안이 없었다는 뜻입니다. 처음 본 자료나 미노출 실전 평가를 뜻하지 않습니다. 구형 기록에 구분 정보가 없으면 추정하지 않습니다.</p>
    </section>
    <section className="flat-section" aria-label="연습 문제 정답률">
      <h2>연습 문제 정답률</h2>
      <p className="meta-text mt-2" id="practice-period-help">기간 선택은 아래 연습 정답률과 추이에만 적용됩니다.</p>
      <div className="period-switch flex-wrap mt-3" role="group" aria-label="연습 정답률 기간" aria-describedby="practice-period-help">
        {([7, 30] as const).map(days => <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)}>최근 {days}일</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-6">
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
      <h2>보완할 시대·문항 유형</h2><p className="meta-text mt-2">전체 풀이 기록의 시대·문항 유형별 집계입니다. 기록이 적거나 반복 풀이가 많으면 학습 상태를 충분히 설명하지 못할 수 있습니다.</p>
      {weak.length ? weak.slice(0, 4).map((area, index) => <div className="weak-row" key={`${area.kind}-${area.key}`}>
        <span>{String(index+1).padStart(2, '0')}</span><div><h3>{area.label}</h3><p>{area.attemptCount}문제 · 정답률 {area.accuracy}%</p></div>
        <Link className="touch-target" to={area.kind === 'era' ? `/library?tab=concepts&era=${area.key}` : '/cards'} aria-label={`${area.label} 보완 학습`}><ArrowIcon /></Link>
      </div>) : <p className="meta-text mt-5">{attempts.length ? '현재 기록에서 표시할 보완 영역이 없습니다. 기록이 적어 집계되지 않은 영역도 있으므로 모든 범위의 숙달을 뜻하지는 않습니다.' : '풀이 기록이 없어 보완할 시대·문항 유형을 아직 확인할 수 없습니다.'}</p>}
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
