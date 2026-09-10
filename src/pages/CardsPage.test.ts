/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { CardsPage } from './CardsPage'
import { db } from '../db/database'
import { seedCards } from '../db/seed'
import { toDateKey } from '../lib/dates'
import { buildTodayPlan } from '../lib/studyService'
import { resetAppDb, seedCore } from '../test/idb'

afterEach(async () => {
  cleanup()
  await resetAppDb()
})

describe('CardsPage', () => {
  it('offers review when every due card belongs to another era', async () => {
    await resetAppDb()
    await seedCore()
    const today = toDateKey()
    const plan = await buildTodayPlan(today)
    const foreignCard = seedCards(today).find((card) => card.era !== plan.lesson.era)
    expect(foreignCard).toBeDefined()
    await db.cards.put({ ...foreignCard!, nextReviewAt: today })

    render(createElement(MemoryRouter, null, createElement(CardsPage)))

    expect(await screen.findByText('복습 대기 1장 중 오늘의 분량 1장')).toBeTruthy()
    expect(screen.getByRole('button', { name: '1장 복습 시작' })).toBeEnabled()
  })
})
