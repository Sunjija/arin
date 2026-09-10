/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { SettingsPage } from './SettingsPage'
import { db } from '../db/database'
import { resetAppDb, seedCore } from '../test/idb'

afterEach(async () => {
  cleanup()
  await resetAppDb()
})

function renderSettings() {
  return render(createElement(MemoryRouter, null, createElement(SettingsPage)))
}

describe('SettingsPage save validation', () => {
  it('rejects 0 daily questions and does not write the invalid value', async () => {
    await resetAppDb()
    await seedCore({ dailyQuestionCount: 15 })
    const user = userEvent.setup()
    renderSettings()
    const input = await screen.findByLabelText('하루 문제 수')
    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(await screen.findByText('하루 문제 수는 5개에서 40개 사이입니다.')).toBeTruthy()
    expect(screen.queryByText('설정을 저장했습니다.')).toBeNull()
    expect((await db.settings.get('settings'))?.dailyQuestionCount).toBe(15)
  })

  it('saves the allowed boundary of 5 questions', async () => {
    await resetAppDb()
    await seedCore({ dailyQuestionCount: 15 })
    const user = userEvent.setup()
    renderSettings()
    const input = await screen.findByLabelText('하루 문제 수')
    await user.clear(input)
    await user.type(input, '5')
    await user.click(screen.getByRole('button', { name: '설정 저장' }))
    expect(await screen.findByText('설정을 저장했습니다.')).toBeTruthy()
    expect((await db.settings.get('settings'))?.dailyQuestionCount).toBe(5)
  })
})
