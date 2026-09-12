import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ChoiceOption, InlineStatus } from '../ui'
import { getQuestionById } from '../../data/questions'
import { questionFromSnapshot } from '../../lib/examScoring'
import { questionContextCopy } from '../../lib/questionStudyContext'
import { finishSession, submitSessionAnswer, saveSessionAnswerCause } from '../../lib/studyService'
import { createWrongCardFromQuestion, snapshotFromQuestion } from '../../lib/wrongCard'
import {
  ERA_LABELS,
  WRONG_CAUSE_LABELS,
  type ActiveSession,
  type WrongCause,
} from '../../types'
import { choiceState } from './choiceState'

const CAUSE_OPTIONS = (Object.keys(WRONG_CAUSE_LABELS) as WrongCause[]).filter(
  (cause) => cause !== 'unknown',
)

function QuestionStudyContextNote({
  questionId,
  questionContexts,
}: {
  questionId: string
  questionContexts: ActiveSession['questionContexts']
}) {
  const { reasonLabel, reasonDetail, historyLabel, historyDetail } = questionContextCopy(
    questionContexts?.find((item) => item.questionId === questionId),
  )
  return (
    <aside className="mb-4" aria-label="문제 선정 이유와 풀이 이력">
      <p className="meta-text">
        <span>{reasonLabel}</span>
        <span aria-hidden="true"> · </span>
        <span>{historyLabel}</span>
      </p>
      <p className="meta-text mt-1">{reasonDetail}</p>
      <details className="mt-2">
        <summary className="meta-text touch-target">풀이 이력 기준</summary>
        <p className="meta-text mt-1">{historyDetail}</p>
      </details>
    </aside>
  )
}

export function QuizStep({
  session,
  onChange,
  onFailure,
}: {
  session: ActiveSession
  onChange: (next: ActiveSession, persisted?: boolean) => Promise<void>
  onFailure?: (reason: unknown) => void
}) {
  const questionId = session.questionIds[session.questionIndex]
  const frozenQuestion = session.questionSnapshots?.find((snapshot) => snapshot.questionId === questionId)
  const question = frozenQuestion ? questionFromSnapshot(frozenQuestion) : questionId ? getQuestionById(questionId) : undefined
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [causeSkipped, setCauseSkipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const gradeLock = useRef(false)
  const actionLock = useRef(false)
  const startedAt = useRef(Date.now())
  const frozenMs = useRef<number | null>(null)

  const currentAnswer = useMemo(
    () => session.answered.find((item) => item.questionId === questionId),
    [session.answered, questionId],
  )

  const reportError = (reason: unknown) => {
    onFailure?.(reason)
    setMessageTone('error')
    setMessage(reason instanceof Error ? reason.message : '진행을 저장하지 못했습니다.')
  }

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
      void onChange({ ...session, quizPhase: 'choices', revealedChoices: true }).catch(reportError)
      return
    }
    if (session.quizPhase === 'cause' && !currentAnswer) {
      void onChange({ ...session, quizPhase: 'choices' }).catch(reportError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- normalize leftover multi-step sessions only
  }, [session.quizPhase, session.questionIndex, currentAnswer])

  if (!question) {
    return (
      <div className="surface p-5">
        <p>문제가 없습니다.</p>
        {message && <InlineStatus tone={messageTone}>{message}</InlineStatus>}
        <Button
          className="mt-4 w-full"
          onClick={() => void finishSession(session).then(saved => onChange(saved, true)).catch(reportError)}
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

  const selectChoice = async (index: number) => {
    if (revealed || gradeLock.current || busy) return
    gradeLock.current = true
    setBusy(true)
    try {
      await onChange({ ...session, selectedIndex: index, quizPhase: 'choices' })
      setMessage(null)
    } catch (error) {
      onFailure?.(error)
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '선택을 저장하지 못했습니다.')
    } finally {
      gradeLock.current = false
      setBusy(false)
    }
  }

  const submit = async () => {
    if (session.selectedIndex == null || revealed || gradeLock.current || busy) return
    gradeLock.current = true
    setBusy(true)
    const responseMs = freezeResponseMs()
    try {
      const saved = await submitSessionAnswer(session, responseMs)
      await onChange(saved, true)
      setMessage(null)
    } catch (error) {
      onFailure?.(error)
      gradeLock.current = false
      frozenMs.current = responseMs
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '채점을 저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const applyCause = async (cause: WrongCause) => {
    if (!currentAnswer?.attemptId || busy || actionLock.current) return
    actionLock.current = true
    setBusy(true)
    try {
      await onChange(await saveSessionAnswerCause(session, cause), true)
      setMessage(null)
    } catch (error) {
      onFailure?.(error)
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '오답 원인을 저장하지 못했습니다.')
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  const addWrongCard = async () => {
    if (busy || actionLock.current) return
    actionLock.current = true
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
      onFailure?.(error)
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '카드를 만들지 못했습니다.')
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  const goNext = async () => {
    if (!revealed || busy || actionLock.current) return
    actionLock.current = true
    setBusy(true)
    try {
      const nextIndex = session.questionIndex + 1
      if (nextIndex >= session.questionIds.length) {
        if (session.cardIndex < session.cardIds.length) {
          await onChange({ ...session, questionIndex: nextIndex, step: 'cards' })
          return
        }
        const done = { ...session, questionIndex: nextIndex, step: 'result' as const }
        await onChange(await finishSession(done), true)
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
    } catch (error) {
      onFailure?.(error)
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : '다음 진행을 저장하지 못했습니다.')
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  return (
    <div className="quiz-content">
      {!revealed ? <>
        <span className="pill blue">핵심 문제 · {question.difficulty}점</span>
        <QuestionStudyContextNote questionId={question.id} questionContexts={session.questionContexts} />
        <h1>{question.stem}</h1>
        {question.passage && <blockquote className="passage-text mb-5 whitespace-pre-line">{question.passage}</blockquote>}
        <div className="space-y-2" role="group" aria-label="선택지">
          {question.choices.map((choice, index) => <ChoiceOption key={`${question.id}-${index}`} index={index} label={choice}
            state={choiceState({index, selected: selectedIndex ?? null, revealed, answerIndex: question.answerIndex})}
            onSelect={() => void selectChoice(index)} />)}
        </div>
        <p className="meta-text text-center mt-5">판단한 근거를 떠올린 뒤 확인해 보세요.</p>
        {message && <InlineStatus tone={messageTone}>{message}</InlineStatus>}
        <div className="cta-dock"><Button className="w-full" disabled={session.selectedIndex == null || busy} onClick={() => void submit()}>{busy ? '제출 중…' : '선택한 답 확인'}</Button></div>
      </> : <section className="quiz-feedback">
        <span className={`pill ${correct ? 'green' : 'coral'}`}>{correct ? '정답입니다' : '다시 연결해 볼까요?'}</span>
        <QuestionStudyContextNote questionId={question.id} questionContexts={session.questionContexts} />
        <h1>{correct ? '핵심을 잘 짚었어요.' : '어떤 단서가 있었는지 다시 살펴보세요.'}</h1>
        <p className="meta-text mb-5">{ERA_LABELS[question.era]} · {question.stem}</p>
        {!correct && <><p className="meta-text text-[var(--wrong)]">내 답</p><p className="answer-review wrong">✕ {selectedIndex != null ? `${selectedIndex + 1}. ${question.choices[selectedIndex]}` : '선택 없음'}</p></>}
        <p className="meta-text text-[var(--correct)]">정답</p>
        <p className="answer-review correct">✓ {question.answerIndex + 1}. {question.choices[question.answerIndex]}</p>
        <h2 className="section-title">왜 이 답일까요?</h2>
        <p className="feedback-explanation whitespace-pre-line">{question.explanation}</p>
        <details className="mb-5"><summary className="meta-text touch-target">문제와 전체 선지 다시 보기</summary>
          {question.passage && <blockquote className="passage-text mb-4 whitespace-pre-line">{question.passage}</blockquote>}
          <div className="space-y-2">{question.choices.map((choice, index) => <ChoiceOption key={index} index={index} label={choice}
            state={choiceState({index, selected: selectedIndex ?? null, revealed: true, answerIndex: question.answerIndex})} onSelect={() => {}} />)}</div>
        </details>
        {!correct && <div className="flat-section">
          <h2 className="section-title">어디에서 헷갈렸나요?</h2>
          <div className="cause-options" role="group" aria-label="오답 원인">
            {CAUSE_OPTIONS.map(cause => <Button key={cause} variant={currentAnswer?.cause === cause ? 'primary' : 'secondary'}
              aria-pressed={currentAnswer?.cause === cause} disabled={busy || !currentAnswer?.attemptId} onClick={() => void applyCause(cause)}>{WRONG_CAUSE_LABELS[cause]}</Button>)}
          </div>
          <Button variant="text" className="mt-2" disabled={busy || (currentAnswer?.cause != null && currentAnswer.cause !== 'unknown')} onClick={() => setCauseSkipped(true)}>원인 건너뛰기</Button>
          {causeSkipped && (!currentAnswer?.cause || currentAnswer.cause === 'unknown') && <p className="meta-text">원인은 미확인으로 남습니다.</p>}
          <Button variant="secondary" className="w-full mt-3" disabled={busy} onClick={() => void addWrongCard()}>이 개념을 복습 카드로 추가</Button>
        </div>}
        {message && <InlineStatus tone={messageTone}>{message}</InlineStatus>}
        <div className="cta-dock"><Button className="w-full" disabled={busy} onClick={() => void goNext()}>{session.questionIndex + 1 >= session.questionIds.length ? (session.cardIndex < session.cardIds.length ? '누적 복습 시작' : '결과 보기') : '다음 문제'}</Button></div>
      </section>}
    </div>
  )
}
