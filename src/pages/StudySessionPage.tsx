import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Link } from 'react-router-dom'
import { SessionProgress } from '../components/SessionProgress'
import { lessons } from '../data/lessons'
import { getQuestionById } from '../data/questions'
import { ERA_LABELS, ALL_ERAS, WRONG_CAUSE_LABELS, type CardRating, type WrongCause } from '../types'
import {
  addCardFromContent,
  finishSession,
  rateCard,
  recordQuizAnswer,
  saveSession,
  sessionAnswerStats,
  startOrResumeSession,
} from '../lib/studyService'
import { db } from '../db/database'
import type { ActiveSession, FlashcardRecord } from '../types'

export function StudySessionPage() {
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [cards, setCards] = useState<FlashcardRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const questionStartedAt = useRef(Date.now())

  const refreshCards = useCallback(async (ids: string[]) => {
    const all = await db.cards.bulkGet(ids)
    setCards(all.filter(Boolean) as FlashcardRecord[])
  }, [])

  useEffect(() => {
    let alive = true
    startOrResumeSession()
      .then(async (s) => {
        if (!alive) return
        setSession(s)
        await refreshCards(s.cardIds)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '세션을 시작할 수 없습니다.')
      })
    return () => {
      alive = false
    }
  }, [refreshCards])

  const lesson = useMemo(
    () => lessons.find((l) => l.id === session?.lessonId) ?? lessons[0],
    [session?.lessonId],
  )

  const update = async (next: ActiveSession) => {
    setSession(next)
    await saveSession(next)
  }

  if (error) {
    return (
      <div className="surface p-5">
        <p role="alert">{error}</p>
        <Link className="btn btn-secondary mt-4" to="/">
          홈으로
        </Link>
      </div>
    )
  }

  if (!session) {
    return <div className="surface p-5 text-[var(--ink-muted)]">학습 세션을 불러오는 중…</div>
  }

  return (
    <div>
      <SessionProgress current={session.step} />
      {session.step === 'cards' && (
        <CardsStep
          session={session}
          cards={cards}
          flipped={flipped}
          setFlipped={setFlipped}
          onRate={async (rating) => {
            const card = cards[session.cardIndex]
            if (!card) return
            await rateCard(card.id, rating)
            const nextIndex = session.cardIndex + 1
            if (nextIndex >= session.cardIds.length) {
              await update({ ...session, step: 'concept', cardIndex: nextIndex })
            } else {
              setFlipped(false)
              await update({ ...session, cardIndex: nextIndex })
            }
          }}
          onSkipToConcept={async () => {
            await update({ ...session, step: 'concept' })
          }}
        />
      )}
      {session.step === 'concept' && (
        <ConceptStep
          lesson={lesson}
          memo={session.conceptMemo}
          onMemo={async (conceptMemo) => update({ ...session, conceptMemo })}
          onDone={async () => {
            questionStartedAt.current = Date.now()
            await update({ ...session, conceptDone: true, step: 'quiz', quizPhase: 'stem' })
          }}
        />
      )}
      {session.step === 'quiz' && (
        <QuizStep
          session={session}
          onChange={update}
          questionStartedAt={questionStartedAt}
        />
      )}
      {session.step === 'result' && <ResultStep session={session} lessonTitle={lesson.title} />}
    </div>
  )
}

function CardsStep({
  session,
  cards,
  flipped,
  setFlipped,
  onRate,
  onSkipToConcept,
}: {
  session: ActiveSession
  cards: FlashcardRecord[]
  flipped: boolean
  setFlipped: (v: boolean) => void
  onRate: (rating: CardRating) => Promise<void>
  onSkipToConcept: () => Promise<void>
}) {
  const card = cards[session.cardIndex]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(!flipped)
      }
      if (!flipped) return
      if (e.key === '1') void onRate('again')
      if (e.key === '2') void onRate('hard')
      if (e.key === '3') void onRate('good')
      if (e.key === '4') void onRate('easy')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, flipped, onRate, setFlipped])

  if (!card) {
    return (
      <div className="surface p-5">
        <p>오늘 복습할 카드가 없습니다.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => void onSkipToConcept()}>
          개념 학습으로
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-muted)]">
        카드 {session.cardIndex + 1} / {session.cardIds.length} · {ERA_LABELS[card.era]}
      </p>
      <button
        type="button"
        className="flashcard surface w-full"
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? '카드 앞면 보기' : '카드 답 공개'}
      >
        <div>
          <p className="mb-2 text-sm text-[var(--ink-muted)]">{flipped ? '답' : '질문'}</p>
          <p className="font-display text-xl leading-relaxed">{flipped ? card.back : card.front}</p>
        </div>
      </button>
      {flipped ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['again', '모름', 'btn-wrong'],
              ['hard', '헷갈림', 'btn-secondary'],
              ['good', '맞음', 'btn-correct'],
              ['easy', '너무 쉬움', 'btn-primary'],
            ] as const
          ).map(([rating, label, cls]) => (
            <button
              key={rating}
              type="button"
              className={`btn ${cls}`}
              onClick={() => void onRate(rating)}
              aria-label={`평가: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">카드를 누르거나 Space/Enter로 답을 확인하세요.</p>
      )}
    </div>
  )
}

function ConceptStep({
  lesson,
  memo,
  onMemo,
  onDone,
}: {
  lesson: (typeof lessons)[number]
  memo: string
  onMemo: (v: string) => Promise<void>
  onDone: () => Promise<void>
}) {
  return (
    <div className="surface space-y-4 p-5">
      <div>
        <p className="text-sm text-[var(--accent)]">{ERA_LABELS[lesson.era]}</p>
        <h1 className="font-display text-2xl">{lesson.title}</h1>
        <p className="mt-2 text-[var(--ink-muted)]">{lesson.summary}</p>
      </div>
      <div>
        <h2 className="font-semibold">핵심 키워드</h2>
        <p className="mt-1 text-[var(--ink)]">{lesson.keywords.join(' · ')}</p>
      </div>
      <div>
        <h2 className="font-semibold">반드시 구분할 체크포인트</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {lesson.checkpoints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <label className="block">
        <span className="text-sm font-medium">교재·강의 범위 메모</span>
        <textarea
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
          rows={3}
          value={memo}
          onChange={(e) => void onMemo(e.target.value)}
          placeholder="예: 자습서 고려 광종·성종 단원"
        />
      </label>
      <button type="button" className="btn btn-primary w-full" onClick={() => void onDone()}>
        개념 학습 완료 · 문제 풀기
      </button>
    </div>
  )
}

function QuizStep({
  session,
  onChange,
  questionStartedAt,
}: {
  session: ActiveSession
  onChange: (s: ActiveSession) => Promise<void>
  questionStartedAt: MutableRefObject<number>
}) {
  const qid = session.questionIds[session.questionIndex]
  const question = qid ? getQuestionById(qid) : undefined
  const [message, setMessage] = useState<string | null>(null)

  if (!question) {
    return (
      <div className="surface p-5">
        <p>문제가 없습니다.</p>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => void finishSession(session).then((_) => onChange({ ...session, step: 'result' }))}
        >
          결과 보기
        </button>
      </div>
    )
  }

  const goNext = async (answered = session.answered) => {
    const nextIndex = session.questionIndex + 1
    if (nextIndex >= session.questionIds.length) {
      const done = { ...session, answered, step: 'result' as const }
      await finishSession(done)
      await onChange(done)
      return
    }
    questionStartedAt.current = Date.now()
    await onChange({
      ...session,
      answered,
      questionIndex: nextIndex,
      quizPhase: 'stem',
      eraGuess: undefined,
      clueMemo: '',
      selectedIndex: undefined,
      revealedChoices: false,
    })
  }

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-sm text-[var(--ink-muted)]">
        문제 {session.questionIndex + 1} / {session.questionIds.length} · 배점 {question.difficulty}점
      </p>
      {question.passage ? (
        <blockquote className="rounded-xl bg-[var(--accent-soft)]/50 p-4 text-[0.95rem] leading-relaxed">
          {question.passage}
        </blockquote>
      ) : null}
      <h1 className="text-lg font-semibold leading-relaxed">{question.stem}</h1>

      {session.quizPhase === 'stem' && (
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => void onChange({ ...session, quizPhase: 'era' })}
        >
          시대 고르기로
        </button>
      )}

      {session.quizPhase === 'era' && (
        <div className="space-y-2">
          <p className="font-medium">어느 시대의 내용인가?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_ERAS.map((era) => (
              <button
                key={era}
                type="button"
                className={`btn ${session.eraGuess === era ? 'btn-primary' : 'btn-secondary'} justify-start`}
                onClick={() => void onChange({ ...session, eraGuess: era, quizPhase: 'clue' })}
              >
                {ERA_LABELS[era]}
              </button>
            ))}
          </div>
        </div>
      )}

      {(session.quizPhase === 'clue' || session.quizPhase === 'choices' || session.quizPhase === 'feedback' || session.quizPhase === 'cause') && (
        <label className="block">
          <span className="text-sm font-medium">핵심 단서 메모</span>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
            value={session.clueMemo}
            onChange={(e) => void onChange({ ...session, clueMemo: e.target.value })}
            placeholder="예: 노비안검·과거 → 광종"
            disabled={session.quizPhase === 'feedback' || session.quizPhase === 'cause'}
          />
        </label>
      )}

      {session.quizPhase === 'clue' && (
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => void onChange({ ...session, quizPhase: 'choices', revealedChoices: true })}
        >
          선택지 보기
        </button>
      )}

      {session.quizPhase === 'choices' && (
        <div className="space-y-2">
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              type="button"
              className={`btn w-full justify-start ${session.selectedIndex === index ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => void onChange({ ...session, selectedIndex: index })}
            >
              <span className="mr-2 font-semibold">{index + 1}.</span> {choice}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={session.selectedIndex == null}
            onClick={async () => {
              if (session.selectedIndex == null) return
              const correct = session.selectedIndex === question.answerIndex
              const responseMs = Date.now() - questionStartedAt.current
              if (correct) {
                await recordQuizAnswer({
                  question,
                  selectedIndex: session.selectedIndex,
                  correct: true,
                  responseMs,
                  source: 'practice',
                })
                const answered = [
                  ...session.answered,
                  {
                    questionId: question.id,
                    correct: true,
                    selectedIndex: session.selectedIndex,
                    responseMs,
                    eraGuess: session.eraGuess,
                    clueMemo: session.clueMemo,
                  },
                ]
                await onChange({ ...session, answered, quizPhase: 'feedback' })
              } else {
                await onChange({ ...session, quizPhase: 'cause' })
              }
            }}
          >
            정답 제출
          </button>
        </div>
      )}

      {session.quizPhase === 'cause' && (
        <div className="space-y-2">
          <p className="font-medium">오답 원인을 선택해 주세요</p>
          {(Object.keys(WRONG_CAUSE_LABELS) as WrongCause[]).map((cause) => (
            <button
              key={cause}
              type="button"
              className="btn btn-secondary w-full justify-start"
              onClick={async () => {
                if (session.selectedIndex == null) return
                const responseMs = Date.now() - questionStartedAt.current
                await recordQuizAnswer({
                  question,
                  selectedIndex: session.selectedIndex,
                  correct: false,
                  responseMs,
                  cause,
                  source: 'practice',
                })
                const answered = [
                  ...session.answered,
                  {
                    questionId: question.id,
                    correct: false,
                    selectedIndex: session.selectedIndex,
                    cause,
                    responseMs,
                    eraGuess: session.eraGuess,
                    clueMemo: session.clueMemo,
                  },
                ]
                await onChange({ ...session, answered, quizPhase: 'feedback' })
              }}
            >
              {WRONG_CAUSE_LABELS[cause]}
            </button>
          ))}
        </div>
      )}

      {session.quizPhase === 'feedback' && (
        <div className="space-y-3">
          <p className={`font-semibold ${session.answered.at(-1)?.correct ? 'text-[var(--correct)]' : 'text-[var(--wrong)]'}`}>
            {session.answered.at(-1)?.correct ? '정답입니다' : '오답입니다'}
            <span className="ml-2 text-sm font-normal text-[var(--ink-muted)]">
              (정답: {question.answerIndex + 1}번)
            </span>
          </p>
          <p className="leading-relaxed">{question.explanation}</p>
          {!session.answered.at(-1)?.correct && (
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={async () => {
                const { created } = await addCardFromContent({
                  front: question.stem,
                  back: `${question.choices[question.answerIndex]} — ${question.explanation}`,
                  kind: 'concept',
                  era: question.era,
                  tags: question.tags,
                  fromWrongAnswer: true,
                })
                setMessage(created ? '암기카드에 추가했습니다.' : '같은 카드가 이미 있어 추가하지 않았습니다.')
              }}
            >
              카드로 추가
            </button>
          )}
          {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
          <button type="button" className="btn btn-primary w-full" onClick={() => void goNext()}>
            다음
          </button>
        </div>
      )}
    </div>
  )
}

function ResultStep({ session, lessonTitle }: { session: ActiveSession; lessonTitle: string }) {
  const stats = sessionAnswerStats(session.answered)
  return (
    <div className="surface space-y-4 p-5">
      <h1 className="font-display text-2xl">오늘 학습 결과</h1>
      <p className="text-[var(--ink-muted)]">{lessonTitle} 학습을 마쳤습니다.</p>
      <ul className="space-y-2">
        <li>복습 카드 {session.cardIds.length}장</li>
        <li>
          맞춤 문제 {stats.correct}/{stats.total} 정답 ({stats.accuracy}%)
        </li>
        <li>오답 {stats.total - stats.correct}문항은 카드·복습 일정에 반영됩니다.</li>
      </ul>
      <p className="text-sm text-[var(--ink-muted)]">
        다음 복습일과 내일 학습 범위는 홈 화면에서 자동으로 갱신됩니다.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link to="/" className="btn btn-primary">
          홈으로
        </Link>
        <Link to="/cards" className="btn btn-secondary">
          오답·카드 보기
        </Link>
      </div>
    </div>
  )
}
