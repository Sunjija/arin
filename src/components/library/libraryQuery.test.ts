import { describe, expect, it } from 'vitest'
import { LIBRARY_QUERY_KEYS } from '../layout/navConfig'
import { parseLibraryQuery, serializeLibraryQuery } from './libraryQuery'

describe('library query', () => {
  it('parses tab, era, q, sort from LIBRARY_QUERY_KEYS', () => {
    const params = new URLSearchParams()
    params.set(LIBRARY_QUERY_KEYS.tab, 'concepts')
    params.set(LIBRARY_QUERY_KEYS.era, 'goryeo')
    params.set(LIBRARY_QUERY_KEYS.q, '광종')
    params.set(LIBRARY_QUERY_KEYS.sort, 'desc')
    expect(parseLibraryQuery(params)).toEqual({
      tab: 'concepts',
      era: 'goryeo',
      q: '광종',
      sort: 'desc',
    })
  })

  it('falls back to timeline / all / empty / asc for invalid values', () => {
    const params = new URLSearchParams('tab=cards&era=unknown&sort=recent&q=')
    expect(parseLibraryQuery(params)).toEqual({
      tab: 'timeline',
      era: 'all',
      q: '',
      sort: 'asc',
    })
  })

  it('omits default keys so restored URLs stay compact', () => {
    const params = serializeLibraryQuery({
      tab: 'timeline',
      era: 'all',
      q: '',
      sort: 'asc',
    })
    expect(params.toString()).toBe('')
  })

  it('round-trips non-default query state', () => {
    const state = {
      tab: 'concepts' as const,
      era: 'colonial' as const,
      q: '임시정부',
      sort: 'desc' as const,
    }
    expect(parseLibraryQuery(serializeLibraryQuery(state))).toEqual(state)
  })
})
