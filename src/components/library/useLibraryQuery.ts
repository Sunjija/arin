import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  parseLibraryQuery,
  serializeLibraryQuery,
  type LibraryQueryState,
} from './libraryQuery'

export function useLibraryQuery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseLibraryQuery(searchParams), [searchParams])

  const update = useCallback(
    (patch: Partial<LibraryQueryState>) => {
      const next = { ...parseLibraryQuery(searchParams), ...patch }
      setSearchParams(serializeLibraryQuery(next), { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return [query, update] as const
}
