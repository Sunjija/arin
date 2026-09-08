import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ChoiceOption, InlineStatus } from '../ui'
import { getQuestionById } from '../../data/questions'
import { finishSession, recordQuizAnswer, updateAttemptCause } from '../../lib/studyService'
import { createWrongCardFromQuestion, snapshotFromQuestion } from '../../lib/wrongCard'
import {
  ERA_LABELS,
  WRONG_CAUSE_LABELS,
  type ActiveSession,
  type SessionAnswer,
  type WrongCause,
} from '../../types'
import { choiceState } from './choiceState'

const CAUSE_OPTIONS = (Object.keys(WRONG_CAUSE_LABELS) as WrongCause[]).filter(
  (cause) => cause !== 'unknown',
)

export function QuizStep({
  session,
  onChange,
}: {
  session: ActiveSession
  onChange: (next: ActiveSession) => Promise<void>
}) {
  const questionId = session.questionIds[session.questionIndex]
  const question = questionId ? getQuestionById(questionId) : undefined
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [causeSkipped, setCauseSkipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const gradeLock = useRef(false)
  const startedAt = useRef(Date.now())
  const frozenMs = useRef<number | null>(null)

  const currentAnswer = useMemo(
    () => session.answered.find((item) => item.questionId === questionId),
    [session.answered, questionId],
  )

  useEffect(() => {
    const existing = session.answered.find((item) => item.questionId === questionId)
    startedAt.current = Date.now()
    frozenMs.current = existing?.responseMs ?? null
    gradeLock.current = Boolean(existing)
    setCauseSkipped(false)
    setMessage(null)
    // 문항이 바뀔 때만 타이머·잠금을 초기화한다. 원인 갱신으로 풀이 시간을 다시 재지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.questionIndex, questionId])

  useEffect(() => {
    const legacyPhase =
      session.quizPhase === 'stem' ||
      session.quizPhase === 'era' ||
      session.quizPhase === 'clue'
    if (legacyPhase) {
      void onChange({ ...session, quizPhase: 'choices', revealedChoices: true })
      return
    }
    if (session.quizPhase === 'cause' && !currentAnswer) {
      void onChange({ ...session, quizPhase: 'choices' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- normalize leftover multi-step sessions only
  }, [session.quizPhase, session.questionIndex, currentAnswer])

  if (!question) {
    return (
      <div className="surface p-5">
        <p>문제가 없습니다.</p>
        <Button
          className="mt-4 w-full"
          onClick={() => void finishSession(session).then(() => onChange({ ...session, step: 'result' }))}
        >
          결과 보기
        </Button>
      </div>
    )
  }

  const selectedIndex = currentAnswer?.selectedIndex ?? session.selectedIndex
  const revealed = Boolean(currentAnswer)
  const correct = currentAnswer?.correct ?? false

  const freezeResponseMs = () => {
    if (frozenMs.current == null) frozenMs.current = Math.max(0, Date.now() - startedAt.current)
    return frozenMs.current
  }

  const selectChoice = (index: number) => {
    if (revealed || gradeLock.current || busy) return
    void onChange({ ...session, selectedIndex: index, quizPhase: 'choices' })
  }

  const submit = async () => {
    if (session.selectedIndex == null || revealed || gradeLock.current || busy) return
    gradeLock.current = true
    setBusy(true)
    const chosen = session.selectedIndex
    const isCorrect = chosen === question.answerIndex
    const responseMs = freezeResponseMs()
    const attemptId = `att-${session.id}-q${session.questionIndex}-${question.id}`
    try {
      const attempt = await recordQuizAnswer({
        question,
        selectedIndex: chosen,
        correct: isCorrect,
        responseMs,
        cause: 'unknown',
        source: 'practice',
        attemptId,
      })
      const answered: SessionAnswer[] = [
        ...session.answered.filter((item) => item.questionId !== question.id),
        {
          questionId: question.id,
          correct: isCorrect,
          selectedIndex: chosen,
          cause: isCorrect ? undefined : 'unknown',
          responseMs,
          eraGuess: session.eraGuess,
          clueMemo: session.clueMemo,
          attemptId: attempt.id,
        },
      ]
      await onChange({ ...session, answered, quizPhase: 'feedback', selectedIndex: chosen })
    } catch (error) {
      gradeLock.current = false
      frozenMs.current = responseMs
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '채점을 저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const applyCause = async (cause: WrongCause) => {
    if (!currentAnswer?.attemptId || busy) return
    setBusy(true)
    try {
      await updateAttemptCause(currentAnswer.attemptId, cause)
      const answered = session.answered.map((item) =>
        item.attemptId === currentAnswer.attemptId ? { ...item, cause } : item,
      )
      await onChange({ ...session, answered })
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '오답 원인을 저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const addWrongCard = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await createWrongCardFromQuestion({
        questionId: question.id,
        snapshot: snapshotFromQuestion(question),
      })
      if (!result.ok) {
        setMessageTone('error')
        setMessage(
          '원문 문항을 찾을 수 없어 카드를 만들지 않았습니다. 복습 화면에서 직접 편집해 주세요.',
        )
        return
      }
      setMessageTone('success')
      setMessage(result.created ? '암기카드에 추가했습니다.' : '같은 카드가 이미 있어 추가하지 않았습니다.')
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '카드를 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const goNext = async () => {
    if (!revealed || busy) return
    setBusy(true)
    try {
      const nextIndex = session.questionIndex + 1
      if (nextIndex >= session.questionIds.length) {
        const done = { ...session, step: 'result' as const }
        await finishSession(done)
        await onChange(done)
        return
      }
      await onChange({
        ...session,
        questionIndex: nextIndex,
        quizPhase: 'choices',
        eraGuess: undefined,
        clueMemo: '',
        selectedIndex: undefined,
        revealedChoices: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface space-y-4 p-5">
      <p className="meta-text">
        문제 {session.questionIndex + 1} / {session.questionIds.length}
        {revealed ? ` · ${ERA_LABELS[question.era]} · 배점 ${question.difficulty}점` : ''}
      </p>
      {question.passage ? (
        <blockquote className="passage-text rounded-xl bg-[var(--accent-soft)]/50 p-4 whitespace-pre-line">
          {question.passage}
        </blockquote>
      ) : null}
      <h1 className="text-lg font-semibold leading-relaxed">{question.stem}</h1>

      <div className="space-y-2" role="group" aria-label="선택지">
        {question.choices.map((choice, index) => (
          <ChoiceOption
            key={`${choice}-${index}`}
            index={index}
            label={choice}
            state={choiceState({
              index,
              selected: selectedIndex ?? null,
              revealed,
              answerIndex: question.answerIndex,
            })}
            onSelect={() => selectChoice(index)}
          />
        ))}
      </div>

      {!revealed ? (
        <div className="cta-dock">
          <Button
            className="w-full"
            disabled={session.selectedIndex == null || busy}
            onClick={() => void submit()}
          >
            {busy ? '제출 중…' : '정답 제출'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={`font-semibold ${correct ? 'text-[var(--correct)]' : 'text-[var(--wrong)]'}`}>
            {correct ? '정답입니다' : '오답입니다'}
            <span className="ml-2 text-sm font-normal text-[var(--ink-muted)]">
              (정답: {question.answerIndex + 1}번)
            </span>
          </p>
          <p className="passage-text leading-relaxed">{question.explanation}</p>

          {!correct ? (
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void addWrongCard()}>
                카드로 추가
              </Button>
              {!causeSkipped ? (
                <>
                  <p className="font-medium">오답 원인</p>
                  <p className="meta-text">정답과 해설을 확인한 뒤 고르세요. 풀이 시간에는 더하지 않습니다.</p>
                  {CAUSE_OPTIONS.map((cause) => (
                    <Button
                      key={cause}
                      variant={currentAnswer?.cause === cause ? 'primary' : 'secondary'}
                      className="w-full justify-start"
                      disabled={busy || !currentAnswer?.attemptId}
                      onClick={() => void applyCause(cause)}
                    >
                      {WRONG_CAUSE_LABELS[cause]}
                    </Button>
                  ))}
                  <Button variant="text" className="w-full" disabled={busy} onClick={() => setCauseSkipped(true)}>
                    원인 건너뛰기
                  </Button>
                </>
              ) : (
                <p className="meta-text">원인을 건너뛰었습니다. 기록은 미확인으로 남습니다.</p>
              )}
            </div>
          ) : null}

          {message ? <InlineStatus tone={messageTone}>{message}</InlineStatus> : null}

          <div className="cta-dock">
            <Button className="w-full" disabled={busy} onClick={() => void goNext()}>
              {session.questionIndex + 1 >= session.questionIds.length ? '결과 보기' : '다음 문제'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
