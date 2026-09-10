/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { LessonPractice } from './LessonPractice'
import { questions } from '../../data/questions'
afterEach(cleanup)
it('runs only the chosen lesson, hides explanations until submission, and reports the result', async () => {
  const user = userEvent.setup()
  render(<LessonPractice lessonId="lesson-01" />)
  await user.click(screen.getByRole('button', { name: '이 단원 문제 풀기' }))
  const bank = questions.filter((q) => q.lessonId === 'lesson-01')
  for (const [index, question] of bank.entries()) {
    expect(screen.getByRole('heading', { name: question.stem })).toBeVisible()
    expect(screen.queryByText(question.explanation)).toBeNull()
    expect(screen.getByRole('button', { name: '답 확인' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: `${question.answerIndex + 1}. ${question.choices[question.answerIndex]}` }))
    await user.click(screen.getByRole('button', { name: '답 확인' }))
    expect(screen.getByText(question.explanation)).toBeVisible()
    await user.click(screen.getByRole('button', { name: index === bank.length - 1 ? '결과 보기' : '다음 문제' }))
  }
  expect(screen.getByRole('heading', { name: `단원 확인 완료 · ${bank.length} / ${bank.length}` })).toBeVisible()
})
