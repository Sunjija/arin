import { ALL_ERAS, ERA_LABELS } from '../../types'
import type { EraFilter, LibrarySort } from './libraryQuery'

export function LibraryFilters({
  era,
  q,
  sort,
  searchLabel,
  searchPlaceholder,
  resultCount,
  onEraChange,
  onQueryChange,
  onSortChange,
}: {
  era: EraFilter
  q: string
  sort: LibrarySort
  searchLabel: string
  searchPlaceholder: string
  resultCount: number
  onEraChange: (era: EraFilter) => void
  onQueryChange: (q: string) => void
  onSortChange: (sort: LibrarySort) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          className="field-control min-w-0 flex-1"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
        />
        <p className="meta-text shrink-0" aria-live="polite">
          {resultCount}건
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:hidden">
        <select
          className="field-control"
          value={era}
          aria-label="시대"
          onChange={(event) => onEraChange(event.target.value as EraFilter)}
        >
          <option value="all">전체</option>
          {ALL_ERAS.map((id) => (
            <option key={id} value={id}>
              {ERA_LABELS[id]}
            </option>
          ))}
        </select>
        <select
          className="field-control"
          value={sort}
          aria-label="정렬"
          onChange={(event) => onSortChange(event.target.value as LibrarySort)}
        >
          <option value="asc">오래된 순</option>
          <option value="desc">최근 순</option>
        </select>
      </div>
      <div className="hidden md:flex md:flex-col md:gap-2">
        <div className="flex flex-wrap gap-1">
          <EraChip selected={era === 'all'} onClick={() => onEraChange('all')}>
            전체
          </EraChip>
          {ALL_ERAS.map((id) => (
            <EraChip key={id} selected={era === id} onClick={() => onEraChange(id)}>
              {ERA_LABELS[id]}
            </EraChip>
          ))}
        </div>
        <div className="flex gap-1">
          <EraChip selected={sort === 'asc'} onClick={() => onSortChange('asc')}>
            오래된 순
          </EraChip>
          <EraChip selected={sort === 'desc'} onClick={() => onSortChange('desc')}>
            최근 순
          </EraChip>
        </div>
      </div>
    </div>
  )
}

function EraChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      className={`btn min-h-10 border-0 px-3 py-2 text-sm shadow-none ${
        selected ? 'btn-primary' : 'btn-ghost'
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
