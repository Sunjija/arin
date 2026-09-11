import { useRef, useState } from 'react'
import { questions } from '../../data/questions'
import { Button, InlineStatus } from '../ui'
import { recordAnswer } from '../../lib/learningApi'

export function LessonPractice({ lessonId }: { lessonId: string }) {
  const [bank] = useState(() => questions.filter((question) => question.lessonId === lessonId))
  const runId = useRef(crypto.randomUUID())
  const lock = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const submit = async () => {
    const question = bank[index]
    if (!question || choice == null || revealed || lock.current) return
    lock.current = true
    setSaving(true)
    setError(null)
    try {
      const attempt = await recordAnswer({ question, selectedIndex: choice, correct: choice === question.answerIndex, responseMs: null, learningSource: 'library', attemptId: `att-library-${runId.current}-${question.id}` })
      setChoice(attempt.selectedIndex)
      setRevealed(true)
      if (attempt.correct) setScore(value => value + 1)
    } catch {
      setError('답안을 저장하지 못했습니다. 다시 눌러 저장해 주세요.')
    } finally { lock.current = false; setSaving(false) }
  }
  if (!bank.length) return null
  if (!started) return <section><h3>읽은 내용을 확인해 보세요</h3><p className="mb-4">이 단원의 {bank.length}문제를 풀고, 헷갈린 개념을 바로 확인하세요. 답안은 학습 기록에 저장됩니다. 자료실 문제 풀이만으로 단원 전체를 완료 처리하지는 않습니다.</p><Button onClick={() => setStarted(true)}>이 단원 문제 풀기</Button></section>
  if (index >= bank.length) return <section aria-live="polite"><h3>단원 확인 완료 · {score} / {bank.length}</h3><p>헷갈렸던 유물과 제도를 위의 개념에서 다시 비교해 보세요.</p><Button onClick={() => { runId.current = crypto.randomUUID(); setIndex(0); setScore(0); setChoice(null); setRevealed(false) }}>다시 풀기</Button></section>
  const question = bank[index]
  return <section className="lesson-practice" aria-label="단원 확인 문제">
    <p className="meta-text">확인 문제 {index + 1} / {bank.length}</p>
    <h3>{question.stem}</h3>
    {question.passage && <blockquote className="passage-text">{question.passage}</blockquote>}
    <div className="space-y-2" role="group" aria-label="답 선택">{question.choices.map((text, option) => <button className="field-control text-left" key={text} disabled={revealed || saving} aria-pressed={choice === option} onClick={() => setChoice(option)}>{option + 1}. {text}{revealed && option === question.answerIndex ? ' ✓ 정답' : ''}</button>)}</div>
    {revealed ? <div className="mt-5" aria-live="polite"><h4>{choice === question.answerIndex ? '정답입니다' : '다시 확인해 보세요'}</h4><p className="my-3">{question.explanation}</p><Button onClick={() => { setIndex(index + 1); setChoice(null); setRevealed(false) }}>{index + 1 === bank.length ? '결과 보기' : '다음 문제'}</Button></div> : <Button className="mt-4" disabled={choice == null || saving} onClick={() => void submit()}>{saving ? '저장 중…' : '답 확인'}</Button>}
    {error && <InlineStatus tone="error">{error}</InlineStatus>}
  </section>
}
