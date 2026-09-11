import { useState } from 'react'
import { eventsByEra } from '../../data/timeline'
import type { TimelineEvent } from '../../data/timeline'
import { EmptyResults } from './EmptyResults'
import { Chevron } from './Chevron'
import { LibraryFilters } from './LibraryFilters'
import { filterTimelineEvents } from './libraryFilter'
import type { EraFilter, LibrarySort } from './libraryQuery'

export function TimelineExplorer({
  era,
  q,
  sort,
  onEraChange,
  onQueryChange,
  onSortChange,
  onReset,
}: {
  era: EraFilter
  q: string
  sort: LibrarySort
  onEraChange: (era: EraFilter) => void
  onQueryChange: (q: string) => void
  onSortChange: (sort: LibrarySort) => void
  onReset: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const events = filterTimelineEvents(eventsByEra('all'), era, q, sort)

  return (
    <div className="space-y-2">
      <LibraryFilters
        era={era}
        q={q}
        sort={sort}
        searchLabel="연표 검색"
        searchPlaceholder="사건·연도 검색"
        resultCount={events.length}
        onEraChange={onEraChange}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
      />
      {events.length === 0 ? (
        <EmptyResults
          title="해당하는 사건이 없습니다."
          canClearQuery={Boolean(q.trim())}
          onClearQuery={() => onQueryChange('')}
          onReset={onReset}
        />
      ) : (
        <ol className="divide-y divide-[var(--line)]">
          {events.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              open={openId === event.id}
              first={index === 0}
              onToggle={() => setOpenId((current) => (current === event.id ? null : event.id))}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function TimelineItem({
  event,
  open,
  first,
  onToggle,
}: {
  event: TimelineEvent
  open: boolean
  first: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full min-h-11 flex-col gap-1 py-2 text-left"
        aria-expanded={open}
        data-library-first-event={first ? 'true' : undefined}
        onClick={onToggle}
      >
        <span className="flex w-full items-start gap-3">
          <span className="w-[5.5rem] shrink-0 text-right text-[0.78rem] font-bold leading-snug text-[var(--accent)]">
            {event.yearLabel}
          </span>
          <span className="min-w-0 flex-1 font-bold leading-snug">{event.title}</span>
          <Chevron open={open} />
        </span>
        {open ? <span className="meta-text pl-[calc(5.5rem+0.75rem)]">{event.detail}</span> : null}
      </button>
    </li>
  )
}
