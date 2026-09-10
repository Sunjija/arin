import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { questions } from '../data/questions'
import { useFocusLayout } from '../components/layout/useFocusLayout'
import { MockPrepScreen } from '../components/mock/MockPrepScreen'
import { MockRunScreen } from '../components/mock/MockRunScreen'
import { MockResultScreen } from '../components/mock/MockResultScreen'
import {
  accumulateItemElapsed,
  applyChoice,
  canStartFull,
  createProgressSaver,
  createSubmitOnce,
  existingProgressCopy,
  mockAttemptId,
  nextAction,
  resolveActiveMockAction,
  resumeState,
  snapshotForAutoSubmit,
  type MockView,
} from '../components/mock/mockExamLogic'
import {
  FULL_QUESTION_COUNT,
  SAMPLE_QUESTION_COUNT,
  buildMockSnapshots,
  questionFromSnapshot,
} from '../lib/examScoring'
import {
  FULL_DURATION_MS,
  SAMPLE_DURATION_MS,
  finalizeMock,
  getActiveMock,
  saveMockProgress,
  startMock,
} from '../lib/mockSession'
import { createWrongCardFromQuestion } from '../lib/wrongCard'
import { getScoreSummary, recordQuizAnswer, updateAttemptCause } from '../lib/studyService'
import { Button, Dialog } from '../components/ui'
import { useAppPause } from '../platform/useAppPause'
import { useHardwareBack } from '../platform/useHardwareBack'
import type { ActiveMock, MockExamResult, QuestionSnapshot, WrongCause } from '../types'
import type { ScoreSummary } from '../types/contracts'

export function MockExamPage() {
  const [view, setView] = useState<MockView>('prep')
  const [selectedMode, setSelectedMode] = useState<'sample' | 'full'>('sample')
  const [activeMock, setActiveMock] = useState<ActiveMock | undefined>()
  const [summary, setSummary] = useState<ScoreSummary | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [unansweredOpen, setUnansweredOpen] = useState(false)

  const [mockId, setMockId] = useState<string | null>(null)
  const [mode, setMode] = useState<'sample' | 'full'>('sample')
  const [snapshots, setSnapshots] = useState<QuestionSnapshot[]>([])
  const [answers, setAnswers] = useState<Array<number | null>>([])
  const [itemElapsedMs, setItemElapsedMs] = useState<Array<number | null>>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [result, setResult] = useState<MockExamResult | null>(null)
  const [causes, setCauses] = useState<Record<string, WrongCause>>({})
  const [cardMessages, setCardMessages] = useState<Record<string, string>>({})

  const answersRef = useRef(answers)
  const itemElapsedRef = useRef(itemElapsedMs)
  const currentIndexRef = useRef(currentIndex)
  const deadlineAtRef = useRef(deadlineAt)
  const mockIdRef = useRef(mockId)
  const snapshotsRef = useRef(snapshots)
  const itemStartedAtRef = useRef<number | null>(null)
  const saverRef = useRef<ReturnType<typeof createProgressSaver> | null>(null)
  const submitLockRef = useRef(createSubmitOnce())
  const submitRef = useRef<(auto: boolean) => Promise<void>>(async () => {})

  answersRef.current = answers
  itemElapsedRef.current = itemElapsedMs
  currentIndexRef.current = currentIndex
  deadlineAtRef.current = deadlineAt
  mockIdRef.current = mockId
  snapshotsRef.current = snapshots

  const focused = view === 'running' || view === 'confirm'
  useFocusLayout(focused)

  const uniqueQuestionCount = useMemo(
    () => new Set(questions.map((item) => item.id)).size,
    [],
  )
  const poolBlocked = uniqueQuestionCount < FULL_QUESTION_COUNT

  const remaining = deadlineAt ? Math.max(0, Date.parse(deadlineAt) - nowMs) : 0

  const refreshPrep = useCallback(async () => {
    const [mock, score] = await Promise.all([getActiveMock(), getScoreSummary()])
    setActiveMock(mock?.status === 'in-progress' ? mock : undefined)
    setSummary(score)
  }, [])

  useEffect(() => {
    void (async () => {
      const mock = await getActiveMock()
      const action = resolveActiveMockAction(mock, Date.now())
      if (action.type === 'finalize-expired') {
        await finalizeExpiredMock(action.mock)
        return
      }
      await refreshPrep()
    })()
  }, [refreshPrep])

  function attachSaver(revision: number) {
    const saver = createProgressSaver(async (input) => {
      try {
        const saved = await saveMockProgress(input)
        if (saved.ok) {
          setSaveError(null)
        } else if (saved.code === 'stale-revision') {
          setSaveError(null)
        } else if (saved.code !== 'already-finalized') {
          setSaveError(saved.code)
        }
        return saved
      } catch (error) {
        const message = error instanceof Error ? error.message : 'save-failed'
        setSaveError(message)
        throw error
      }
    })
    saver.setRevision(revision)
    saverRef.current = saver
    return saver
  }

  function flushItemTime() {
    const started = itemStartedAtRef.current
    if (started == null) return
    const delta = Date.now() - started
    const next = accumulateItemElapsed(itemElapsedRef.current, currentIndexRef.current, delta)
    itemElapsedRef.current = next
    setItemElapsedMs(next)
    itemStartedAtRef.current = Date.now()
  }

  function persistProgress() {
    const id = mockIdRef.current
    const saver = saverRef.current
    if (!id || !saver) return
    flushItemTime()
    void saver.enqueue({
      id,
      answers: answersRef.current,
      currentIndex: currentIndexRef.current,
      itemElapsedMs: itemElapsedRef.current,
    })
  }

  function hydrateFromMock(mock: ActiveMock) {
    const restored = resumeState(mock)
    setMockId(mock.id)
    setMode(mock.mode)
    setSnapshots(restored.snapshots)
    setAnswers(restored.answers)
    setItemElapsedMs(restored.itemElapsedMs)
    setCurrentIndex(restored.currentIndex)
    setDeadlineAt(mock.deadlineAt)
    setResult(null)
    answersRef.current = restored.answers
    itemElapsedRef.current = restored.itemElapsedMs
    currentIndexRef.current = restored.currentIndex
    snapshotsRef.current = restored.snapshots
    mockIdRef.current = mock.id
    deadlineAtRef.current = mock.deadlineAt
    submitLockRef.current = createSubmitOnce()
    attachSaver(restored.revision)
    return restored
  }

  function enterFromMock(mock: ActiveMock, options?: { confirming?: boolean }) {
    hydrateFromMock(mock)
    itemStartedAtRef.current = Date.now()
    setView(options?.confirming ? 'confirm' : 'running')
    setNowMs(Date.now())
  }

  async function finalizeExpiredMock(mock: ActiveMock) {
    hydrateFromMock(mock)
    itemStartedAtRef.current = null
    const outcome = await submitLockRef.current.run(async () => {
      const finalized = await finalizeMock({
        id: mock.id,
        answers: mock.answers,
        itemElapsedMs: mock.itemElapsedMs,
      })
      if (finalized.created) {
        await recordAttempts(finalized.result, mock.questionSnapshots)
      }
      const score = await getScoreSummary()
      return { finalized, score }
    })
    if (outcome.status === 'skipped') return
    setResult(outcome.value.finalized.result)
    setSummary(outcome.value.score)
    setActiveMock(undefined)
    setView('result')
  }

  async function startExam(replaceExisting = false) {
    setBusy(true)
    setNotice(null)
    try {
      const count = selectedMode === 'full' ? FULL_QUESTION_COUNT : SAMPLE_QUESTION_COUNT
      const nextSnapshots = buildMockSnapshots(questions, count)
      if (selectedMode === 'full' && !canStartFull(nextSnapshots).ok) {
        setNotice('고유 문항이 50개보다 적어 실전 연습을 시작할 수 없습니다. 10문항 연습을 이용해 주세요.')
        setSelectedMode('sample')
        return
      }
      const started = await startMock({
        mode: selectedMode,
        snapshots: nextSnapshots,
        durationMs: selectedMode === 'full' ? FULL_DURATION_MS : SAMPLE_DURATION_MS,
        replaceExisting,
      })
      if (!started.ok) {
        if (started.code === 'conflict' && started.activeMock) {
          setActiveMock(started.activeMock)
          setReplaceOpen(true)
          return
        }
        if (started.code === 'insufficient-pool') {
          setNotice('고유 문항이 50개보다 적어 실전 연습을 시작할 수 없습니다. 10문항 연습을 이용해 주세요.')
          setSelectedMode('sample')
        }
        return
      }
      setReplaceOpen(false)
      setActiveMock(undefined)
      enterFromMock(started.mock)
    } finally {
      setBusy(false)
    }
  }

  async function recordAttempts(next: MockExamResult, sourceSnapshots: QuestionSnapshot[]) {
    for (const [index, snapshot] of sourceSnapshots.entries()) {
      const selectedIndex = answersRef.current[index]
      if (selectedIndex == null) continue
      const question = questionFromSnapshot(snapshot)
      const correct = selectedIndex === snapshot.answerIndex
      await recordQuizAnswer({
        question,
        selectedIndex,
        correct,
        responseMs: itemElapsedRef.current[index] ?? null,
        cause: correct ? undefined : 'unknown',
        source: 'mock',
        resultId: next.id,
        attemptId: mockAttemptId(next.id, snapshot.questionId),
      })
      if (!correct) {
        setCauses((current) => ({ ...current, [snapshot.questionId]: current[snapshot.questionId] ?? 'unknown' }))
      }
    }
  }

  async function submitExam(auto: boolean) {
    const id = mockIdRef.current
    if (!id) return
    flushItemTime()
    const unanswered = answersRef.current.filter((answer) => answer == null).length
    if (!auto && unanswered > 0 && view !== 'confirm') {
      setView('confirm')
      return
    }
    if (!auto && unanswered > 0 && !unansweredOpen && view === 'confirm') {
      setUnansweredOpen(true)
      return
    }
    setUnansweredOpen(false)
    try {
      await saverRef.current?.flush()
    } catch {
      return
    }
    const outcome = await submitLockRef.current.run(async () => {
      const payload = snapshotForAutoSubmit({
        id,
        revision: saverRef.current?.getRevision() ?? 1,
        getAnswers: () => answersRef.current,
        getItemElapsedMs: () => itemElapsedRef.current,
      })
      const finalized = await finalizeMock(payload)
      if (finalized.created) {
        await recordAttempts(finalized.result, snapshotsRef.current)
      }
      const score = await getScoreSummary()
      return { finalized, score }
    })
    if (outcome.status === 'skipped') return
    setResult(outcome.value.finalized.result)
    setSummary(outcome.value.score)
    setActiveMock(undefined)
    setView('result')
    itemStartedAtRef.current = null
  }

  submitRef.current = submitExam

  useEffect(() => {
    if (view !== 'running' && view !== 'confirm') return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      const deadline = deadlineAtRef.current
      if (deadline && Date.parse(deadline) <= now) {
        void submitRef.current(true)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [view])

  function selectChoice(choice: number) {
    const next = applyChoice(answersRef.current, currentIndexRef.current, choice)
    answersRef.current = next
    setAnswers(next)
    persistProgress()
  }

  function goToIndex(index: number) {
    if (index < 0 || index >= snapshotsRef.current.length) return
    flushItemTime()
    currentIndexRef.current = index
    setCurrentIndex(index)
    setView('running')
    persistProgress()
  }

  function goNext() {
    const action = nextAction(currentIndexRef.current, snapshotsRef.current.length)
    if (action === 'confirm') {
      flushItemTime()
      persistProgress()
      setView('confirm')
      return
    }
    goToIndex(action.index)
  }

  function goPrev() {
    goToIndex(currentIndexRef.current - 1)
  }

  async function closeRunning() {
    persistProgress()
    try {
      await saverRef.current?.flush()
    } catch {
      return
    }
    itemStartedAtRef.current = null
    setView('prep')
    await refreshPrep()
  }

  useAppPause(() => {
    persistProgress()
  })
  useHardwareBack(focused, () => {
    void closeRunning()
    return true
  })

  async function handleCause(questionId: string, cause: WrongCause) {
    setCauses((current) => ({ ...current, [questionId]: cause }))
    if (!result) return
    try {
      await updateAttemptCause(mockAttemptId(result.id, questionId), cause)
    } catch {
      setCardMessages((current) => ({
        ...current,
        [questionId]: '원인을 저장하지 못했습니다. 다시 시도해 주세요.',
      }))
    }
  }

  async function handleAddCard(index: number) {
    const snapshot = snapshots[index]
    if (!snapshot) return
    const created = await createWrongCardFromQuestion({
      questionId: snapshot.questionId,
      snapshot,
    })
    if (!created.ok) {
      setCardMessages((current) => ({
        ...current,
        [snapshot.questionId]: '원문을 찾을 수 없어 카드를 만들지 않았습니다. 복습에서 직접 만들어 주세요.',
      }))
      return
    }
    setCardMessages((current) => ({
      ...current,
      [snapshot.questionId]: created.created ? '오답 카드를 만들었습니다.' : '이미 같은 카드가 있습니다.',
    }))
  }

  async function backToPrep() {
    setView('prep')
    setResult(null)
    setMockId(null)
    setNotice(null)
    await refreshPrep()
  }

  if (view === 'result' && result) {
    return (
      <MockResultScreen
        result={result}
        snapshots={snapshots}
        answers={answers}
        summary={summary}
        causes={causes}
        cardMessages={cardMessages}
        onCause={(questionId, cause) => void handleCause(questionId, cause)}
        onAddCard={(index) => void handleAddCard(index)}
        onHome={() => void backToPrep()}
      />
    )
  }

  if ((view === 'running' || view === 'confirm') && snapshots.length > 0) {
    return (
      <>
        <MockRunScreen
          mode={mode}
          snapshots={snapshots}
          answers={answers}
          currentIndex={currentIndex}
          remainingMs={remaining}
          confirming={view === 'confirm'}
          saveError={saveError}
          onSelect={selectChoice}
          onPrev={goPrev}
          onNext={goNext}
          onJump={goToIndex}
          onClose={() => void closeRunning()}
          onRetrySave={() => persistProgress()}
          onSubmit={() => void submitExam(false)}
          onBackToItem={() => setView('running')}
        />
        <Dialog open={unansweredOpen} title="미응답 문항" onClose={() => setUnansweredOpen(false)}>
          <p>미응답 {answers.filter((answer) => answer == null).length}문항이 있습니다. 이대로 제출할까요?</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setUnansweredOpen(false)}>
              돌아가기
            </Button>
            <Button
              onClick={() => {
                setUnansweredOpen(false)
                void submitExam(true)
              }}
            >
              제출
            </Button>
          </div>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <MockPrepScreen
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
        onStart={() => {
          if (activeMock) {
            setReplaceOpen(true)
            return
          }
          void startExam(false)
        }}
        onResume={() => {
          if (!activeMock) return
          enterFromMock(activeMock)
        }}
        activeMock={activeMock}
        summary={summary}
        notice={notice}
        busy={busy}
        poolBlocked={poolBlocked}
      />
      <Dialog open={replaceOpen} title="진행 중인 시험" onClose={() => setReplaceOpen(false)}>
        <p>{activeMock ? existingProgressCopy(activeMock) : '진행 중인 시험을 덮어쓸까요?'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setReplaceOpen(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setReplaceOpen(false)
              void startExam(true)
            }}
          >
            새로 시작
          </Button>
        </div>
      </Dialog>
    </>
  )
}
