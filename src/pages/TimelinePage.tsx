import { useMemo, useState } from 'react'
import { eventsByEra, type TimelineEvent } from '../data/timeline'
import { ALL_ERAS, ERA_LABELS, type EraId } from '../types'

type EraFilter = EraId | 'all'

export function TimelinePage() {
  const [era, setEra] = useState<EraFilter>('all')
  const [query, setQuery] = useState('')
  const [newestFirst, setNewestFirst] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = eventsByEra(era).filter((event) => {
      if (!needle) return true
      return `${event.yearLabel} ${event.title} ${event.detail}`.toLowerCase().includes(needle)
    })
    return newestFirst ? [...list].reverse() : list
  }, [era, query, newestFirst])

  return (
    <div className="space-y-5">
      <header className="page-header">
        <p className="eyebrow">연표</p>
        <h1 className="page-title">한국사 연표</h1>
      </header>

      <section className="surface space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap gap-1">
          <FilterChip selected={era === 'all'} onClick={() => setEra('all')}>
            전체
          </FilterChip>
          {ALL_ERAS.filter((id) => id !== 'culture').map((id) => (
            <FilterChip key={id} selected={era === id} onClick={() => setEra(id)}>
              {ERA_LABELS[id]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field-control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="사건·연도 검색"
            aria-label="연표 검색"
          />
          <button
            type="button"
            className={`btn ${newestFirst ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setNewestFirst((value) => !value)}
          >
            {newestFirst ? '최근순' : '과거순'}
          </button>
        </div>
      </section>

      <p className="text-sm text-[var(--ink-muted)]">{events.length}건</p>

      {events.length === 0 ? (
        <div className="surface p-5 text-[var(--ink-muted)]">해당하는 사건이 없습니다.</div>
      ) : (
        <ol className="timeline">
          {events.map((event) => (
            <TimelineItem
              key={event.id}
              event={event}
              open={activeId === event.id}
              onToggle={() => setActiveId((current) => (current === event.id ? null : event.id))}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function FilterChip({
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
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function TimelineItem({
  event,
  open,
  onToggle,
}: {
  event: TimelineEvent
  open: boolean
  onToggle: () => void
}) {
  return (
    <li className={`timeline-item ${open ? 'open' : ''}`}>
      <button type="button" className="timeline-button" onClick={onToggle}>
        <span className="timeline-year">{event.yearLabel}</span>
        <span className="timeline-dot" aria-hidden />
        <span className="timeline-body">
          <span className="timeline-title">{event.title}</span>
          <span className="timeline-era">{ERA_LABELS[event.era]}</span>
          {open ? <span className="timeline-detail">{event.detail}</span> : null}
        </span>
      </button>
    </li>
  )
}
