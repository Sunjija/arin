import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFocusLayout } from '../components/layout/useFocusLayout'
import { StudyFocusHeader } from '../components/study/StudyFocusHeader'
import { CardsStep } from '../components/study/CardsStep'
import { ConceptStep } from '../components/study/ConceptStep'
import { QuizStep } from '../components/study/QuizStep'
import { ResultStep } from '../components/study/ResultStep'
import { Button, InlineStatus } from '../components/ui'
import { lessons } from '../data/lessons'
import { advanceSessionCard, finishSession, getSavedSession, saveSession, startOrResumeSession } from '../lib/studyService'
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
  const [reloading, setReloading] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const saveLock = useRef(false)

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

  const reportFailure = (reason: unknown) => {
    setSaveError(reason instanceof Error ? reason.message : '진행을 저장하지 못했습니다. 다시 시도하거나 저장된 진행을 불러와 주세요.')
  }

  const persist = async (next: ActiveSession, persisted = false) => {
    if (persisted) {
      setSession(current => current?.id === next.id && (current.revision ?? 0) <= (next.revision ?? 0) ? next : current)
      setSaveError(null)
      return
    }
    if (saveLock.current) throw new Error('진행을 저장 중입니다. 잠시 후 다시 시도해 주세요.')
    saveLock.current = true
    try {
      const saved = next.step === 'result' ? await finishSession(next) : await saveSession(next)
      setSession(current => current?.id === saved.id && (current.revision ?? 0) <= (saved.revision ?? 0) ? saved : current)
      setSaveError(null)
    } catch (reason) {
      reportFailure(reason)
      throw reason
    } finally {
      saveLock.current = false
    }
  }

  const reloadSaved = async () => {
    if (reloading || saveLock.current) return
    setReloading(true)
    try {
      const saved = await getSavedSession()
      await refreshCards(saved.cardIds)
      setSession(current => current?.id === saved.id && (current.revision ?? 0) > (saved.revision ?? 0) ? current : saved)
      setReloadVersion(value => value + 1)
      setSaveError(null)
    } catch (reason) {
      reportFailure(reason)
    } finally {
      setReloading(false)
    }
  }

  const closeToHome = () => {
    if (!session || closing || saveLock.current) return
    setClosing(true)
    navigate(session.entryMode === 'review' ? '/cards' : '/')
  }

  const afterCards = async (next: ActiveSession) => {
    if (next.conceptDone && next.questionIndex < next.questionIds.length) {
      await persist({ ...next, step: 'quiz' })
      return
    }
    if (next.entryMode === 'review' || next.conceptDone) {
      const done = { ...next, step: 'result' as const }
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

      {saveError && <Button variant="secondary" className="mb-4" disabled={reloading} onClick={() => void reloadSaved()}>
        {reloading ? '진행을 불러오는 중…' : '저장된 진행 다시 불러오기'}
      </Button>}
      <fieldset disabled={reloading} className="min-w-0">
      {session.step === 'cards' && (
        <CardsStep
          key={`${session.id}-${reloadVersion}-${session.cardIndex}-${cards[session.cardIndex]?.id ?? 'loading'}`}
          session={session}
          cards={cards}
          onAdvance={async (rating, requeue) => {
            try {
              const saved = await advanceSessionCard(session, rating, requeue)
              await persist(saved, true)
              await refreshCards(saved.cardIds)
            } catch (reason) {
              reportFailure(reason)
              throw reason
            }
          }}
          onSkip={() => afterCards(session).catch(reportFailure)}
        />
      )}
      {session.step === 'concept' && (
        <ConceptStep
          key={`${session.id}-${reloadVersion}`}
          lesson={lesson}
          memo={session.conceptMemo}
          guideSnapshots={session.guideSnapshots}
          confirmedConceptIds={session.confirmedConceptIds}
          questionCount={session.questionIds.length}
          onConfirm={session.conceptIds ? async (id, checked) => persist({ ...session, confirmedConceptIds: checked ? [...new Set([...(session.confirmedConceptIds ?? []), id])] : session.confirmedConceptIds?.filter(item => item !== id) }) : undefined}
          onMemo={async (conceptMemo) => persist({ ...session, conceptMemo })}
          onDone={async () => {
            const next = { ...session, conceptDone: true, quizPhase: 'choices' as const, revealedChoices: true }
            if (next.questionIds.length) await persist({ ...next, step: 'quiz' })
            else if (next.cardIds.length) await persist({ ...next, step: 'cards' })
            else {
              const done = { ...next, step: 'result' as const }
              await persist(done)
            }
          }}
        />
      )}
      {session.step === 'quiz' && <QuizStep key={`${session.id}-${reloadVersion}`} session={session} onChange={persist} onFailure={reportFailure} />}
      {session.step === 'result' && <ResultStep session={session} lessonTitle={lesson.title} />}
      </fieldset>
    </div>
  )
}
