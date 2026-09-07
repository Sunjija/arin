import { useEffect, useState } from 'react'
import { MasteryBar } from '../components/MasteryBar'
import { getProgressSnapshot } from '../lib/studyService'
import { ALL_ERAS, ALL_TYPES, ERA_LABELS, TYPE_LABELS, WRONG_CAUSE_LABELS, type WrongCause } from '../types'

export function ProgressPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProgressSnapshot>> | null>(null)

  useEffect(() => {
    void getProgressSnapshot().then(setData)
  }, [])

  if (!data) {
    return <div className="surface p-5 text-[var(--ink-muted)]">진도를 불러오는 중…</div>
  }

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <h1 className="font-display text-2xl">진도 · 분석</h1>
        <p className="mt-2 leading-relaxed">{data.advice}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--accent-soft)]/60 p-4">
            <p className="text-sm text-[var(--ink-muted)]">예상 시험 점수</p>
            <p className="text-2xl font-semibold">
              {data.estimated}점
              {data.scoreIsEstimate ? <span className="ml-2 text-sm font-normal">(연습 기반 추정)</span> : null}
            </p>
          </div>
          <div className="rounded-xl bg-white/50 p-4">
            <p className="text-sm text-[var(--ink-muted)]">85점 이상 연속</p>
            <p className="text-2xl font-semibold">
              {data.streak85}회{data.stable ? ' · 1급 안정권' : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-xl">취약 영역 3개</h2>
        <ul className="mt-3 space-y-2">
          {data.weak.map((w) => (
            <li key={w}>· {w}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          최근 7일 정답률 {data.accuracy7}%
          {data.topCause
            ? ` · 잦은 오답 원인: ${WRONG_CAUSE_LABELS[data.topCause as WrongCause] ?? data.topCause}`
            : ''}
        </p>
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="font-display text-xl">시대별 숙련도</h2>
        {ALL_ERAS.map((era) => (
          <MasteryBar key={era} label={ERA_LABELS[era]} value={data.mastery.eras[era]} />
        ))}
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="font-display text-xl">유형별 숙련도</h2>
        {ALL_TYPES.map((type) => (
          <MasteryBar key={type} label={TYPE_LABELS[type]} value={data.mastery.types[type]} />
        ))}
      </section>

      <section className="surface p-5">
        <h2 className="font-display text-xl">최근 모의고사</h2>
        {data.mockScores.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">아직 모의고사 기록이 없습니다.</p>
        ) : (
          <ol className="mt-3 space-y-1">
            {data.mockScores.map((score, i) => (
              <li key={`${score}-${i}`}>
                {i + 1}회차 전: {score}점
              </li>
            ))}
          </ol>
        )}
        <h3 className="mt-4 font-semibold">최근 학습량</h3>
        {data.recentStudy.length === 0 ? (
          <p className="text-[var(--ink-muted)]">기록 없음</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {data.recentStudy.slice(0, 7).map((d) => (
              <li key={d.date}>
                {d.date}: 문제 {d.questionsAnswered} · 카드 {d.cardsReviewed} · {d.minutesSpent}분
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
