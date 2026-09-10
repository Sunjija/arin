import { useState } from 'react'
import { questions } from '../../data/questions'
import { Button } from '../ui'

export function LessonPractice({ lessonId }: { lessonId: string }) {
  const bank = questions.filter((question) => question.lessonId === lessonId)
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  if (!bank.length) return null
  if (!started) return <section><h3>읽은 내용을 확인해 보세요</h3><p className="mb-4">이 단원의 {bank.length}문제를 풀고, 헷갈린 개념을 바로 확인하세요. 이 확인 문제는 오늘 학습 기록에 합산되지 않습니다.</p><Button onClick={() => setStarted(true)}>이 단원 문제 풀기</Button></section>
  if (index >= bank.length) return <section aria-live="polite"><h3>단원 확인 완료 · {score} / {bank.length}</h3><p>헷갈렸던 유물과 제도를 위의 개념에서 다시 비교해 보세요.</p><Button onClick={() => { setIndex(0); setScore(0); setChoice(null); setRevealed(false) }}>다시 풀기</Button></section>
  const question = bank[index]
  return <section className="lesson-practice" aria-label="단원 확인 문제">
    <p className="meta-text">확인 문제 {index + 1} / {bank.length}</p>
    <h3>{question.stem}</h3>
    {question.passage && <blockquote className="passage-text">{question.passage}</blockquote>}
    <div className="space-y-2" role="group" aria-label="답 선택">{question.choices.map((text, option) => <button className="field-control text-left" key={text} disabled={revealed} aria-pressed={choice === option} onClick={() => setChoice(option)}>{option + 1}. {text}{revealed && option === question.answerIndex ? ' ✓ 정답' : ''}</button>)}</div>
    {revealed ? <div className="mt-5" aria-live="polite"><h4>{choice === question.answerIndex ? '정답입니다' : '다시 확인해 보세요'}</h4><p className="my-3">{question.explanation}</p><Button onClick={() => { setIndex(index + 1); setChoice(null); setRevealed(false) }}>{index + 1 === bank.length ? '결과 보기' : '다음 문제'}</Button></div> : <Button className="mt-4" disabled={choice == null} onClick={() => { setRevealed(true); if (choice === question.answerIndex) setScore(score + 1) }}>답 확인</Button>}
  </section>
}
