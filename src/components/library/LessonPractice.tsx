import { useEffect, useRef, useState } from 'react'
import { questions } from '../../data/questions'
import { Button, InlineStatus } from '../ui'
import { isDataError } from '../../lib/dataErrors'
import {
  advanceLibraryPractice,
  getLibraryPractice,
  restartLibraryPractice,
  selectLibraryChoice,
  startLibraryPractice,
  submitLibraryAnswer,
} from '../../lib/libraryPractice'
import type { LibraryPracticeSession } from '../../types'

type View = 'loading' | 'intro' | 'active' | 'load-error'

function itemKey(session: LibraryPracticeSession) {
  return {
    lessonId: session.lessonId,
    sessionId: session.id,
    questionId: session.questionSnapshots[session.questionIndex]!.questionId,
    revision: session.revision,
  }
}

function correctCount(session: LibraryPracticeSession) {
  return session.answers.filter((answer) => answer.correct).length
}

function messageOf(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.includes('다른 창')) {
    return '다른 창에서 진행이 바뀌었습니다. 저장된 진행을 다시 불러와 주세요.'
  }
  // DataError 문구는 사용자용. 디스크/인덱스 등 원문 예외는 노출하지 않는다.
  if (isDataError(error) && error.message) return error.message
  return fallback
}

function isConflictMessage(message: string) {
  return message.includes('다른 창')
}

export function LessonPractice({ lessonId }: { lessonId: string }) {
  const bankCount = questions.filter((question) => question.lessonId === lessonId).length
  const generation = useRef(0)
  const lock = useRef(false)
  const [activeLesson, setActiveLesson] = useState(lessonId)
  const [view, setView] = useState<View>('loading')
  const [session, setSession] = useState<LibraryPracticeSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (activeLesson !== lessonId) {
    setActiveLesson(lessonId)
    setView('loading')
    setSession(null)
    setBusy(false)
    setError(null)
    setNotice(null)
  }

  useEffect(() => {
    const gen = ++generation.current
    lock.current = false

    void (async () => {
      try {
        const row = await getLibraryPractice(lessonId)
        if (gen !== generation.current) return
        if (row) {
          setSession(row)
          setView('active')
          setNotice('저장된 진행을 불러와 이어서 풀 수 있습니다.')
        } else {
          setView('intro')
        }
      } catch {
        if (gen !== generation.current) return
        setView('load-error')
      }
    })()

    return () => {
      generation.current += 1
    }
  }, [lessonId])

  const stillCurrent = (gen: number) => gen === generation.current

  const finishBusy = (gen: number) => {
    if (!stillCurrent(gen)) return
    lock.current = false
    setBusy(false)
  }

  const runMutation = async (
    gen: number,
    action: () => Promise<LibraryPracticeSession>,
    fallback: string,
  ) => {
    if (lock.current || !stillCurrent(gen)) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const next = await action()
      if (!stillCurrent(gen)) return
      setSession(next)
      setView('active')
      setNotice(null)
    } catch (cause) {
      if (!stillCurrent(gen)) return
      setError(messageOf(cause, fallback))
    } finally {
      finishBusy(gen)
    }
  }

  const reloadSaved = async (gen = generation.current) => {
    if (lock.current || !stillCurrent(gen)) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const row = await getLibraryPractice(lessonId)
      if (!stillCurrent(gen)) return
      if (row) {
        setSession(row)
        setView('active')
        setNotice('저장된 진행을 다시 불러왔습니다.')
      } else {
        setSession(null)
        setView('intro')
        setNotice(null)
      }
    } catch {
      if (!stillCurrent(gen)) return
      setError('저장된 진행을 불러오지 못했습니다. 다시 시도해 주세요.')
      setView((current) => (current === 'loading' ? 'load-error' : current))
    } finally {
      finishBusy(gen)
    }
  }

  const showConflictReload = error != null && isConflictMessage(error)

  const errorBlock = error ? (
    <div className="mt-3 space-y-2">
      <InlineStatus tone="error">{error}</InlineStatus>
      {showConflictReload && (
        <Button variant="secondary" disabled={busy} onClick={() => void reloadSaved()}>
          저장된 진행 다시 불러오기
        </Button>
      )}
    </div>
  ) : null

  if (view === 'loading') {
    return (
      <section aria-busy="true">
        <InlineStatus>저장된 진행을 확인하는 중…</InlineStatus>
      </section>
    )
  }

  if (view === 'load-error') {
    return (
      <section>
        <InlineStatus tone="error">확인 문제 진행을 불러오지 못했습니다.</InlineStatus>
        <Button className="mt-3" disabled={busy} onClick={() => void reloadSaved()}>
          {busy ? '불러오는 중…' : '다시 시도'}
        </Button>
        {errorBlock}
      </section>
    )
  }

  if (view === 'intro' || !session) {
    if (!bankCount) return null
    return (
      <section>
        <h3>읽은 내용을 확인해 보세요</h3>
        <p className="mb-4">
          이 단원의 {bankCount}문제를 풀고, 헷갈린 개념을 바로 확인하세요. 답안은 학습 기록에 저장됩니다.
          중간에 나가도 이 단원에서 이어서 풀 수 있습니다. 자료실 문제 풀이만으로 단원 전체를 완료 처리하지는 않습니다.
        </p>
        <Button
          disabled={busy}
          onClick={() =>
            void runMutation(
              generation.current,
              () => startLibraryPractice(lessonId),
              '확인 문제를 시작하지 못했습니다. 다시 눌러 주세요.',
            )
          }
        >
          {busy ? '시작하는 중…' : '이 단원 문제 풀기'}
        </Button>
        {errorBlock}
      </section>
    )
  }

  if (session.step === 'result') {
    return (
      <section aria-live="polite">
        {notice && <InlineStatus>{notice}</InlineStatus>}
        <h3>
          단원 확인 완료 · {correctCount(session)} / {session.questionSnapshots.length}
        </h3>
        <p>헷갈렸던 유물과 제도를 위의 개념에서 다시 비교해 보세요. 다시 풀기는 새 확인이며, 이전에 남긴 답안 기록은 그대로 둡니다.</p>
        <Button
          disabled={busy}
          onClick={() =>
            void runMutation(
              generation.current,
              () => restartLibraryPractice({ lessonId: session.lessonId, sessionId: session.id }),
              '다시 풀기를 시작하지 못했습니다. 다시 눌러 주세요.',
            )
          }
        >
          {busy ? '준비 중…' : '다시 풀기'}
        </Button>
        {errorBlock}
      </section>
    )
  }

  const snapshot = session.questionSnapshots[session.questionIndex]
  if (!snapshot) return null
  const revealed = session.step === 'feedback'
  const choice = session.selectedIndex

  return (
    <section className="lesson-practice" aria-label="단원 확인 문제">
      {notice && <InlineStatus>{notice}</InlineStatus>}
      <p className="meta-text">
        확인 문제 {session.questionIndex + 1} / {session.questionSnapshots.length}
      </p>
      <h3>{snapshot.stem}</h3>
      {snapshot.passage && <blockquote className="passage-text">{snapshot.passage}</blockquote>}
      <div className="space-y-2" role="group" aria-label="답 선택">
        {snapshot.choices.map((text, option) => (
          <button
            className="field-control text-left"
            key={`${snapshot.questionId}-${option}`}
            disabled={revealed || busy}
            aria-pressed={choice === option}
            onClick={() =>
              void runMutation(
                generation.current,
                () => selectLibraryChoice({ ...itemKey(session), selectedIndex: option }),
                '선택을 저장하지 못했습니다. 다시 눌러 주세요.',
              )
            }
          >
            {option + 1}. {text}
            {revealed && option === snapshot.answerIndex ? ' ✓ 정답' : ''}
          </button>
        ))}
      </div>
      {revealed ? (
        <div className="mt-5" aria-live="polite">
          <h4>{choice === snapshot.answerIndex ? '정답입니다' : '다시 확인해 보세요'}</h4>
          <p className="my-3">{snapshot.explanation}</p>
          <Button
            disabled={busy}
            onClick={() =>
              void runMutation(
                generation.current,
                () => advanceLibraryPractice(itemKey(session)),
                '다음 단계로 넘어가지 못했습니다. 다시 눌러 주세요.',
              )
            }
          >
            {busy
              ? '저장 중…'
              : session.questionIndex + 1 === session.questionSnapshots.length
                ? '결과 보기'
                : '다음 문제'}
          </Button>
        </div>
      ) : (
        <Button
          className="mt-4"
          disabled={choice == null || busy}
          onClick={() =>
            void runMutation(
              generation.current,
              () => submitLibraryAnswer(itemKey(session)),
              '답안을 저장하지 못했습니다. 다시 눌러 저장해 주세요.',
            )
          }
        >
          {busy ? '저장 중…' : '답 확인'}
        </Button>
      )}
      {errorBlock}
    </section>
  )
}
