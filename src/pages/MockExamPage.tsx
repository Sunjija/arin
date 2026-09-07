import { useEffect, useMemo, useState } from 'react'
import { questions } from '../data/questions'
import { pickMockQuestions, scoreFromAnswers } from '../lib/examScoring'
import { addCardFromContent, getSettings, saveMockResult } from '../lib/studyService'
import { ERA_LABELS, TYPE_LABELS, type MockExamResult, type Question } from '../types'
import { consecutiveAboveThreshold, isStableZone } from '../lib/scoreEstimate'
import { db } from '../db/database'

const FULL_COUNT = 50
const FULL_SECONDS = 80 * 60

export function MockExamPage() {
  const [mode, setMode] = useState<'idle' | 'running' | 'result'>('idle')
  const [sampleMode, setSampleMode] = useState(true)
  const [items, setItems] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Array<number | null>>([])
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(FULL_SECONDS)
  const [result, setResult] = useState<MockExamResult | null>(null)
  const [recent, setRecent] = useState<number[]>([])
  const [goal, setGoal] = useState(85)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const settings = await getSettings()
      setGoal(settings.goalScore)
      const mocks = await db.mockResults.orderBy('createdAt').reverse().limit(5).toArray()
      setRecent(mocks.map((m) => m.score))
    })()
  }, [mode])

  useEffect(() => {
    if (mode !== 'running') return
    const timer = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timer)
          void submit(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const unanswered = useMemo(
    () => answers.map((a, i) => (a == null ? i + 1 : null)).filter(Boolean) as number[],
    [answers],
  )

  const start = () => {
    const count = sampleMode ? Math.min(10, questions.length) : FULL_COUNT
    const picked = pickMockQuestions(questions, count)
    setItems(picked)
    setAnswers(Array.from({ length: picked.length }, () => null))
    setIndex(0)
    setRemaining(sampleMode ? Math.round((80 * 60 * count) / 50) : FULL_SECONDS)
    setResult(null)
    setMode('running')
  }

  const submit = async (auto = false) => {
    if (!auto && unanswered.length > 0) {
      const ok = window.confirm(`미응답 ${unanswered.length}문항이 있습니다. 제출할까요?`)
      if (!ok) return
    }
    const graded = items.map((q, i) => ({
      questionId: q.id,
      selectedIndex: answers[i] ?? null,
      correct: answers[i] === q.answerIndex,
      difficulty: q.difficulty,
    }))
    const score = scoreFromAnswers(graded)
    const byEra: MockExamResult['byEra'] = {}
    const byType: MockExamResult['byType'] = {}
    for (const [i, q] of items.entries()) {
      const correct = answers[i] === q.answerIndex
      byEra[q.era] = byEra[q.era] ?? { correct: 0, total: 0 }
      byEra[q.era]!.total += 1
      if (correct) byEra[q.era]!.correct += 1
      for (const tag of q.tags) {
        byType[tag] = byType[tag] ?? { correct: 0, total: 0 }
        byType[tag]!.total += 1
        if (correct) byType[tag]!.correct += 1
      }
    }
    const payload: MockExamResult = {
      id: `mock-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: sampleMode ? 'sample' : 'full',
      total: items.length,
      correct: graded.filter((g) => g.correct).length,
      score,
      durationSec: (sampleMode ? Math.round((80 * 60 * items.length) / 50) : FULL_SECONDS) - remaining,
      answers: graded.map(({ questionId, selectedIndex, correct }) => ({
        questionId,
        selectedIndex,
        correct,
      })),
      byEra,
      byType,
    }
    await saveMockResult(payload)
    setResult(payload)
    setMode('result')
  }

  if (mode === 'idle') {
    return (
      <div className="space-y-4">
        <section className="surface p-5">
          <h1 className="font-display text-2xl">모의고사</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            심화 형식(50문항·80분·1·2·3점 배점)을 지원합니다. 샘플이 부족할 때는 축소 모드를 사용하세요.
            배점 비율은 77~79회 심화 정답표(1점 10·2점 30·3점 10)를 참고합니다.
          </p>
          <label className="mt-4 flex items-center gap-2">
            <input type="checkbox" checked={sampleMode} onChange={(e) => setSampleMode(e.target.checked)} />
            축소 모드 (개발·연습용 10문항)
          </label>
          <button type="button" className="btn btn-primary mt-4 w-full sm:w-auto" onClick={start}>
            시험 시작
          </button>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-xl">최근 점수</h2>
          {recent.length === 0 ? (
            <p className="mt-2 text-[var(--ink-muted)]">기록 없음</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {recent.map((s, i) => (
                <li key={`${s}-${i}`}>{s}점</li>
              ))}
            </ul>
          )}
          {isStableZone(recent, goal, 3) ? (
            <p className="mt-3 font-semibold text-[var(--correct)]">1급 안정권 (목표 점수 이상 3회 연속)</p>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              연속 달성 {consecutiveAboveThreshold(recent, goal)} / 3회
            </p>
          )}
        </section>
      </div>
    )
  }

  if (mode === 'result' && result) {
    return (
      <div className="space-y-4">
        <section className="surface p-5">
          <h1 className="font-display text-2xl">채점 결과</h1>
          <p className="mt-2 text-3xl font-semibold">{result.score}점</p>
          <p className="text-[var(--ink-muted)]">
            {result.correct}/{result.total} 정답 · {result.mode === 'sample' ? '축소 모드' : '정규 형식'}
          </p>
          {isStableZone([result.score, ...recent], goal, 3) ? (
            <p className="mt-3 font-semibold text-[var(--correct)]">1급 안정권</p>
          ) : null}
        </section>
        <section className="surface p-5">
          <h2 className="font-semibold">영역별</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(result.byEra).map(([era, v]) => (
              <li key={era}>
                {ERA_LABELS[era as keyof typeof ERA_LABELS]}: {v.correct}/{v.total}
              </li>
            ))}
          </ul>
          <h2 className="mt-4 font-semibold">유형별</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(result.byType).map(([type, v]) => (
              <li key={type}>
                {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}: {v.correct}/{v.total}
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          {items.map((q, i) => {
            const correct = result.answers[i]?.correct
            if (correct) return null
            return (
              <article key={`${q.id}-${i}`} className="surface p-4">
                <p className="text-sm text-[var(--wrong)]">오답</p>
                <h3 className="font-semibold">{q.stem}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{q.explanation}</p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3"
                  onClick={async () => {
                    const { created } = await addCardFromContent({
                      front: q.stem,
                      back: `${q.choices[q.answerIndex]} — ${q.explanation}`,
                      kind: 'concept',
                      era: q.era,
                      tags: q.tags,
                      fromWrongAnswer: true,
                    })
                    setMessage(created ? '카드 추가됨' : '중복 카드')
                  }}
                >
                  카드로 추가
                </button>
              </article>
            )
          })}
          {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
        </section>
        <button type="button" className="btn btn-primary" onClick={() => setMode('idle')}>
          모의고사 홈
        </button>
      </div>
    )
  }

  const q = items[index]
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-semibold tabular-nums" aria-live="polite">
          남은 시간 {mm}:{ss}
        </p>
        <p className="text-sm text-[var(--ink-muted)]">
          {index + 1} / {items.length} · 미응답 {unanswered.length}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`touch-target rounded-lg px-2 py-1 text-sm ${
              i === index
                ? 'bg-[var(--accent)] text-white'
                : answers[i] == null
                  ? 'bg-[#ebe4d8]'
                  : 'bg-[var(--accent-soft)]'
            }`}
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}번 문제로 이동${answers[i] == null ? ', 미응답' : ', 응답함'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {q ? (
        <section className="surface space-y-3 p-5">
          <p className="text-sm text-[var(--ink-muted)]">배점 {q.difficulty}점 · {ERA_LABELS[q.era]}</p>
          {q.passage ? <blockquote className="rounded-xl bg-[var(--accent-soft)]/40 p-3">{q.passage}</blockquote> : null}
          <h1 className="text-lg font-semibold">{q.stem}</h1>
          <div className="space-y-2">
            {q.choices.map((choice, choiceIndex) => (
              <button
                key={choice}
                type="button"
                className={`btn w-full justify-start ${answers[index] === choiceIndex ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  const next = [...answers]
                  next[index] = choiceIndex
                  setAnswers(next)
                }}
              >
                {choiceIndex + 1}. {choice}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={index === 0}
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={index >= items.length - 1}
              onClick={() => setIndex((v) => Math.min(items.length - 1, v + 1))}
            >
              다음
            </button>
            <button type="button" className="btn btn-primary ml-auto" onClick={() => void submit(false)}>
              제출
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
