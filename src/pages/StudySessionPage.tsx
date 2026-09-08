import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SessionProgress } from '../components/SessionProgress'
import { lessons } from '../data/lessons'
import { getQuestionById } from '../data/questions'
import { buildCardChoiceSet, ratingFromQuizResult, type CardChoiceSet } from '../lib/cardQuiz'
import { ERA_LABELS, WRONG_CAUSE_LABELS, type WrongCause } from '../types'
import {
  addCardFromContent,
  finishSession,
  rateCard,
  recordQuizAnswer,
  saveSession,
  sessionAnswerStats,
  startOrResumeSession,
} from '../lib/studyService'
import { MAX_DAILY_CARDS } from '../lib/studyLimits'
import { db } from '../db/database'
import type { ActiveSession, CardRating, FlashcardRecord } from '../types'

export function StudySessionPage() {
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [cards, setCards] = useState<FlashcardRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [allCards, setAllCards] = useState<FlashcardRecord[]>([])
  const questionStartedAt = useRef(0)

  useEffect(() => {
    questionStartedAt.current = Date.now()
  }, [])

  const refreshCards = useCallback(async (ids: string[]) => {
    const [selected, every] = await Promise.all([db.cards.bulkGet(ids), db.cards.toArray()])
    setCards(selected.filter(Boolean) as FlashcardRecord[])
    setAllCards(every)
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
      <section className="surface mb-5 p-4">
        <SessionProgress current={session.step} />
      </section>
      {session.step === 'cards' && (
        <CardsStep
          key={`${session.cardIndex}-${cards[session.cardIndex]?.id ?? 'loading'}`}
          session={session}
          cards={cards}
          pool={allCards}
          onAdvance={async (rating, requeue) => {
            const card = cards[session.cardIndex]
            if (!card) return
            await rateCard(card.id, rating)
            let nextIds = [...session.cardIds]
            if (requeue && nextIds.length < MAX_DAILY_CARDS) {
              const rest = nextIds.slice(session.cardIndex + 1)
              const insertAt = Math.min(rest.length, 2)
              rest.splice(insertAt, 0, card.id)
              nextIds = [...nextIds.slice(0, session.cardIndex + 1), ...rest]
            }
            const nextIndex = session.cardIndex + 1
            if (nextIndex >= nextIds.length) {
              await update({ ...session, cardIds: nextIds, step: 'concept', cardIndex: nextIndex })
            } else {
              await update({ ...session, cardIds: nextIds, cardIndex: nextIndex })
              await refreshCards(nextIds)
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
            await update({
              ...session,
              conceptDone: true,
              step: 'quiz',
              quizPhase: 'choices',
              revealedChoices: true,
            })
          }}
        />
      )}
      {session.step === 'quiz' && (
        <QuizStep
          session={session}
          onChange={update}
          getElapsedMs={() => Date.now() - questionStartedAt.current}
          resetTimer={() => {
            questionStartedAt.current = Date.now()
          }}
        />
      )}
      {session.step === 'result' && <ResultStep session={session} lessonTitle={lesson.title} />}
    </div>
  )
}

function CardsStep({
  session,
  cards,
  pool,
  onAdvance,
  onSkipToConcept,
}: {
  session: ActiveSession
  cards: FlashcardRecord[]
  pool: FlashcardRecord[]
  onAdvance: (rating: 'again' | 'hard' | 'good' | 'easy', requeue: boolean) => Promise<void>
  onSkipToConcept: () => Promise<void>
}) {
  const card = cards[session.cardIndex]
  const [choiceSet] = useState<CardChoiceSet | null>(() =>
    card ? buildCardChoiceSet(card, pool.length ? pool : cards) : null,
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [pendingReview, setPendingReview] = useState<{
    rating: CardRating
    requeue: boolean
  } | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const startedAt = useRef(0)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  const submit = async (index: number) => {
    if (!choiceSet || revealed) return
    setSelected(index)
    setRevealed(true)
    const correct = index === choiceSet.answerIndex
    const rating = ratingFromQuizResult(correct, Date.now() - startedAt.current)
    setPendingReview({ rating, requeue: !correct })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!choiceSet || revealed) return
      const num = Number(e.key)
      if (num >= 1 && num <= choiceSet.choices.length) {
        e.preventDefault()
        void submit(num - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card || !choiceSet) {
    return (
      <div className="surface p-5">
        <p>오늘 복습할 카드가 없습니다. 바로 오늘 단원 개념으로 넘어갑니다.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={() => void onSkipToConcept()}>
          개념 읽기로
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--ink-muted)]">
          <span>
            카드 {session.cardIndex + 1} / {session.cardIds.length}
          </span>
          <span>
            {ERA_LABELS[card.era]} · {choiceSet.kindLabel}
          </span>
        </div>
        <div
          className="meter"
          role="progressbar"
          aria-label="카드 복습 진행률"
          aria-valuemin={0}
          aria-valuemax={session.cardIds.length}
          aria-valuenow={session.cardIndex}
        >
          <span
            style={{
              width: `${Math.round((session.cardIndex / Math.max(1, session.cardIds.length)) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="surface p-5">
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">{choiceSet.ask}</p>
        <h1 className="font-display text-xl leading-relaxed sm:text-2xl">{choiceSet.prompt}</h1>
      </div>
      <div className="space-y-2" role="group" aria-label="선택지">
        {choiceSet.choices.map((choice, index) => {
          let cls = 'btn btn-secondary choice-option'
          if (revealed && index === choiceSet.answerIndex) cls = 'btn btn-correct choice-option'
          if (revealed && selected === index && index !== choiceSet.answerIndex) {
            cls = 'btn btn-wrong choice-option'
          }
          if (!revealed && selected === index) cls = 'btn btn-primary choice-option'
          return (
            <button
              key={`${choice}-${index}`}
              type="button"
              className={cls}
              disabled={revealed}
              onClick={() => void submit(index)}
              aria-label={`${index + 1}번 ${choice}`}
            >
              <span className="choice-number">{index + 1}</span>
              <span>{choice}</span>
              {revealed && index === choiceSet.answerIndex ? (
                <span className="choice-status">정답</span>
              ) : null}
              {revealed && selected === index && index !== choiceSet.answerIndex ? (
                <span className="choice-status">오답</span>
              ) : null}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-[var(--ink-muted)]" aria-live="polite">
        {revealed
          ? selected === choiceSet.answerIndex
            ? '정답입니다. 아래 버튼을 눌러 다음 카드로 이동하세요.'
            : session.cardIds.length < MAX_DAILY_CARDS
              ? '틀렸습니다. 이 세션 뒤쪽에서 한 번 더 확인합니다.'
              : '틀렸습니다. 복습 일정에 다시 반영합니다.'
          : '번호 키(1–4)로도 고를 수 있습니다. 맞으면 간격이 늘고, 틀리면 곧 다시 복습합니다.'}
      </p>
      {revealed && pendingReview ? (
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={advancing}
          onClick={async () => {
            setAdvancing(true)
            try {
              await onAdvance(pendingReview.rating, pendingReview.requeue)
            } finally {
              setAdvancing(false)
            }
          }}
        >
          {advancing
            ? '저장 중…'
            : session.cardIndex + 1 >= session.cardIds.length && !pendingReview.requeue
              ? '카드 완료 · 개념 읽기로'
              : '다음 카드'}
        </button>
      ) : null}
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
        <p className="text-sm text-[var(--accent)]">
          {ERA_LABELS[lesson.era]} · 오늘 단원 읽기 (약 {lesson.estimatedMinutes}분)
        </p>
        <h1 className="font-display text-2xl">{lesson.title}</h1>
        <p className="mt-2 text-[var(--ink-muted)]">{lesson.summary}</p>
        <p className="mt-3 rounded-xl bg-[var(--accent-soft)]/60 p-3 text-sm leading-relaxed text-[var(--ink)]">
          카드로 키워드를 깨운 뒤, 여기서 오늘 범위를 한 번에 정리합니다. 읽고 나면 같은 범위의 맞춤
          문제로 바로 점검합니다.
        </p>
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
        <span className="text-sm font-medium">교재·강의 범위 메모 (선택)</span>
        <textarea
          className="field-control mt-1"
          rows={3}
          value={memo}
          onChange={(e) => void onMemo(e.target.value)}
          placeholder="예: 자습서 고려 광종·성종 단원 p.42~45"
        />
      </label>
      <button type="button" className="btn btn-primary w-full" onClick={() => void onDone()}>
        읽기 완료 · 맞춤 문제 풀기
      </button>
    </div>
  )
}

function QuizStep({
  session,
  onChange,
  getElapsedMs,
  resetTimer,
}: {
  session: ActiveSession
  onChange: (s: ActiveSession) => Promise<void>
  getElapsedMs: () => number
  resetTimer: () => void
}) {
  const qid = session.questionIds[session.questionIndex]
  const question = qid ? getQuestionById(qid) : undefined
  const [message, setMessage] = useState<string | null>(null)

  // 예전 다단 세션이 남아 있으면 선택지 화면으로 보정
  useEffect(() => {
    if (
      session.quizPhase === 'stem' ||
      session.quizPhase === 'era' ||
      session.quizPhase === 'clue'
    ) {
      void onChange({ ...session, quizPhase: 'choices', revealedChoices: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only normalize legacy phases
  }, [session.quizPhase, session.questionIndex])

  if (!question) {
    return (
      <div className="surface p-5">
        <p>문제가 없습니다.</p>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => void finishSession(session).then(() => onChange({ ...session, step: 'result' }))}
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
    resetTimer()
    setMessage(null)
    await onChange({
      ...session,
      answered,
      questionIndex: nextIndex,
      quizPhase: 'choices',
      eraGuess: undefined,
      clueMemo: '',
      selectedIndex: undefined,
      revealedChoices: true,
    })
  }

  const phase =
    session.quizPhase === 'stem' || session.quizPhase === 'era' || session.quizPhase === 'clue'
      ? 'choices'
      : session.quizPhase

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-sm text-[var(--ink-muted)]">
        문제 {session.questionIndex + 1} / {session.questionIds.length} · 배점 {question.difficulty}점 ·{' '}
        {ERA_LABELS[question.era]}
      </p>
      <p className="rounded-xl bg-[var(--accent-soft)]/50 p-3 text-sm text-[var(--ink-muted)]">
        방금 읽은 개념을 문제로 확인하는 단계입니다. 선지를 고른 뒤 제출하면 바로 해설이 나옵니다.
      </p>
      {question.passage ? (
        <blockquote className="rounded-xl bg-[var(--accent-soft)]/50 p-4 text-[0.95rem] leading-relaxed whitespace-pre-line">
          {question.passage}
        </blockquote>
      ) : null}
      <h1 className="text-lg font-semibold leading-relaxed">{question.stem}</h1>

      {(phase === 'choices' || phase === 'feedback' || phase === 'cause') && (
        <label className="block">
          <span className="text-sm font-medium">단서 메모 (선택)</span>
          <input
            className="field-control mt-1"
            value={session.clueMemo}
            onChange={(e) => void onChange({ ...session, clueMemo: e.target.value })}
            placeholder="예: 노비안검·과거·공복 → 광종"
            disabled={phase === 'feedback' || phase === 'cause'}
          />
        </label>
      )}

      {phase === 'choices' && (
        <div className="space-y-2">
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              type="button"
              className={`btn choice-option ${session.selectedIndex === index ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => void onChange({ ...session, selectedIndex: index, quizPhase: 'choices' })}
            >
              <span className="choice-number">{index + 1}</span>
              <span>{choice}</span>
            </button>
          ))}
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={session.selectedIndex == null}
            onClick={async () => {
              if (session.selectedIndex == null) return
              const correct = session.selectedIndex === question.answerIndex
              const responseMs = getElapsedMs()
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

      {phase === 'cause' && (
        <div className="space-y-2">
          <p className="font-medium">왜 틀렸는지 골라 주세요 (다음에 같은 유형을 더 냅니다)</p>
          {(Object.keys(WRONG_CAUSE_LABELS) as WrongCause[]).map((cause) => (
            <button
              key={cause}
              type="button"
              className="btn btn-secondary w-full justify-start"
              onClick={async () => {
                if (session.selectedIndex == null) return
                const responseMs = getElapsedMs()
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

      {phase === 'feedback' && (
        <div className="space-y-3">
          <p
            className={`font-semibold ${session.answered.at(-1)?.correct ? 'text-[var(--correct)]' : 'text-[var(--wrong)]'}`}
          >
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
            {session.questionIndex + 1 >= session.questionIds.length ? '결과 보기' : '다음 문제'}
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
      <p className="text-[var(--ink-muted)]">
        <strong className="font-medium text-[var(--ink)]">{lessonTitle}</strong> 흐름을 마쳤습니다.
        카드로 암기 → 개념으로 정리 → 문제로 점검한 결과입니다.
      </p>
      <ul className="space-y-2">
        <li>① 카드 복습 {session.cardIds.length}장</li>
        <li>
          ③ 맞춤 문제 {stats.correct}/{stats.total} 정답 ({stats.accuracy}%)
        </li>
        <li>오답은 카드·다음 복습일에 자동 반영됩니다.</li>
      </ul>
      <p className="text-sm text-[var(--ink-muted)]">
        홈으로 돌아가면 내일 범위와 복습 카드 수가 갱신됩니다.
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
