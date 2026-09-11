import { ALL_ERAS, type EraId } from '../../types'
import { LIBRARY_QUERY_KEYS } from '../layout/navConfig'

export type LibraryTab = 'timeline' | 'concepts'
export type LibrarySort = 'asc' | 'desc'
export type EraFilter = EraId | 'all'

export type LibraryQueryState = {
  tab: LibraryTab
  era: EraFilter
  q: string
  sort: LibrarySort
}

export const DEFAULT_LIBRARY_QUERY: LibraryQueryState = {
  tab: 'timeline',
  era: 'all',
  q: '',
  sort: 'asc',
}

const ERA_IDS = new Set<string>(ALL_ERAS)

export function parseLibraryQuery(params: URLSearchParams): LibraryQueryState {
  const tabRaw = params.get(LIBRARY_QUERY_KEYS.tab)
  const eraRaw = params.get(LIBRARY_QUERY_KEYS.era)
  const sortRaw = params.get(LIBRARY_QUERY_KEYS.sort)
  return {
    tab: tabRaw === 'concepts' ? 'concepts' : 'timeline',
    era: eraRaw && ERA_IDS.has(eraRaw) ? (eraRaw as EraId) : 'all',
    q: params.get(LIBRARY_QUERY_KEYS.q) ?? '',
    sort: sortRaw === 'desc' ? 'desc' : 'asc',
  }
}

export function serializeLibraryQuery(state: LibraryQueryState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.tab !== DEFAULT_LIBRARY_QUERY.tab) {
    params.set(LIBRARY_QUERY_KEYS.tab, state.tab)
  }
  if (state.era !== DEFAULT_LIBRARY_QUERY.era) {
    params.set(LIBRARY_QUERY_KEYS.era, state.era)
  }
  if (state.q) params.set(LIBRARY_QUERY_KEYS.q, state.q)
  if (state.sort !== DEFAULT_LIBRARY_QUERY.sort) {
    params.set(LIBRARY_QUERY_KEYS.sort, state.sort)
  }
  return params
}

export function matchesSearch(haystack: string, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return haystack.toLowerCase().includes(needle)
}
