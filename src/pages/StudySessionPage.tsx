import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFocusLayout } from '../components/layout/useFocusLayout'
import { StudyFocusHeader } from '../components/study/StudyFocusHeader'
import { CardsStep } from '../components/study/CardsStep'
import { ConceptStep } from '../components/study/ConceptStep'
import { QuizStep } from '../components/study/QuizStep'
import { ResultStep } from '../components/study/ResultStep'
import { Button, InlineStatus } from '../components/ui'
import { lessons } from '../data/lessons'
import { finishSession, rateCard, saveSession, startOrResumeSession } from '../lib/studyService'
import { MAX_DAILY_CARDS } from '../lib/studyLimits'
import { db } from '../db/database'
import type { ActiveSession, FlashcardRecord, StudyEntryMode } from '../types'

type StudyLocationState = { entryMode?: StudyEntryMode }

export function StudySessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [cards, setCards] = useState<FlashcardRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  const focused = Boolean(session && session.step !== 'result')
  useFocusLayout(focused)

  const refreshCards = useCallback(async (ids: string[]) => {
    const selected = await db.cards.bulkGet(ids)
    setCards(selected.filter(Boolean) as FlashcardRecord[])
  }, [])

  useEffect(() => {
    let alive = true
    const requested: StudyEntryMode =
      (location.state as StudyLocationState | null)?.entryMode === 'review' ? 'review' : 'daily'
    startOrResumeSession({ entryMode: requested })
      .then(async (started) => {
        if (!alive) return
        setSession(started)
        await refreshCards(started.cardIds)
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : '세션을 시작할 수 없습니다.')
      })
    return () => {
      alive = false
    }
  }, [location.state, refreshCards])

  const lesson = useMemo(
    () => lessons.find((item) => item.id === session?.lessonId) ?? lessons[0],
    [session?.lessonId],
  )

  const persist = async (next: ActiveSession) => {
    try {
      await saveSession(next)
      setSession(next)
      setSaveError(null)
    } catch (reason) {
      setSaveError('진행을 저장하지 못했습니다. 이 화면에 머무릅니다.')
      throw reason
    }
  }

  const closeToHome = async () => {
    if (!session || closing) return
    setClosing(true)
    try {
      await saveSession(session)
      setSaveError(null)
      navigate(session.entryMode === 'review' ? '/cards' : '/')
    } catch {
      setSaveError('진행을 저장하지 못했습니다. 이 화면에 머무릅니다.')
      setClosing(false)
    }
  }

  const afterCards = async (next: ActiveSession) => {
    if (next.conceptDone && next.questionIndex < next.questionIds.length) {
      await persist({ ...next, step: 'quiz' })
      return
    }
    if (next.entryMode === 'review' || next.conceptDone) {
      const done = { ...next, step: 'result' as const }
      await finishSession(done)
      await persist(done)
      return
    }
    await persist({ ...next, step: 'concept' })
  }

  if (error) {
    return (
      <div className="focus-reading surface p-5">
        <InlineStatus tone="error">{error}</InlineStatus>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/')}>
          오늘 화면
        </Button>
      </div>
    )
  }

  if (!session) {
    return <div className="focus-reading surface p-5 text-[var(--ink-muted)]">학습 세션을 불러오는 중…</div>
  }

  const progress =
    session.step === 'cards'
      ? { stepLabel: '카드', current: session.cardIndex + 1, total: session.cardIds.length }
      : session.step === 'quiz'
        ? { stepLabel: '문제', current: session.questionIndex + 1, total: session.questionIds.length }
        : { stepLabel: session.step === 'concept' ? '개념' : '결과' }

  return (
    <div className="focus-reading">
      {session.step !== 'result' ? (
        <StudyFocusHeader
          onClose={() => void closeToHome()}
          closing={closing}
          stepLabel={progress.stepLabel}
          current={progress.current}
          total={progress.total}
          saveError={saveError}
        />
      ) : saveError ? (
        <InlineStatus tone="error">{saveError}</InlineStatus>
      ) : null}

      {session.step === 'cards' && (
        <CardsStep
          key={`${session.cardIndex}-${cards[session.cardIndex]?.id ?? 'loading'}`}
          session={session}
          cards={cards}
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
              await afterCards({ ...session, cardIds: nextIds, cardIndex: nextIndex })
            } else {
              await persist({ ...session, cardIds: nextIds, cardIndex: nextIndex })
              await refreshCards(nextIds)
            }
          }}
          onSkip={() => afterCards(session)}
        />
      )}
      {session.step === 'concept' && (
        <ConceptStep
          lesson={lesson}
          memo={session.conceptMemo}
          onMemo={async (conceptMemo) => persist({ ...session, conceptMemo })}
          onDone={() =>
            persist({
              ...session,
              conceptDone: true,
              step: 'quiz',
              quizPhase: 'choices',
              revealedChoices: true,
            })
          }
        />
      )}
      {session.step === 'quiz' && <QuizStep session={session} onChange={persist} />}
      {session.step === 'result' && <ResultStep session={session} lessonTitle={lesson.title} />}
    </div>
  )
}
