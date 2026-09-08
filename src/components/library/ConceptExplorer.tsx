import { useState } from 'react'
import { lessons } from '../../data/lessons'
import { ERA_LABELS } from '../../types'
import { EmptyResults } from './EmptyResults'
import { Chevron } from './Chevron'
import { LibraryFilters } from './LibraryFilters'
import { filterLessons, groupLessonsByEra } from './libraryFilter'
import type { EraFilter, LibrarySort } from './libraryQuery'

export function ConceptExplorer({
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
  const filtered = filterLessons(lessons, era, q, sort)
  const groups = groupLessonsByEra(filtered)

  return (
    <div className="space-y-3">
      <LibraryFilters
        era={era}
        q={q}
        sort={sort}
        searchLabel="개념 검색"
        searchPlaceholder="단원·키워드 검색"
        onEraChange={onEraChange}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
      />
      <p className="meta-text">{filtered.length}건</p>
      {filtered.length === 0 ? (
        <EmptyResults
          title="해당하는 단원이 없습니다."
          canClearQuery={Boolean(q.trim())}
          onClearQuery={() => onQueryChange('')}
          onReset={onReset}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.era} className="space-y-1">
              <h2 className="section-title">{ERA_LABELS[group.era]}</h2>
              <ul className="divide-y divide-[var(--line)]">
                {group.lessons.map((lesson) => {
                  const open = openId === lesson.id
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className="flex w-full min-h-11 flex-col gap-2 py-2 text-left"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenId((current) => (current === lesson.id ? null : lesson.id))
                        }
                      >
                        <span className="flex w-full items-start gap-3">
                          <span className="min-w-0 flex-1 font-bold leading-snug">{lesson.title}</span>
                          <Chevron open={open} />
                        </span>
                        {open ? (
                          <span className="space-y-2">
                            <span className="block text-[var(--ink)]">{lesson.summary}</span>
                            <span className="block">
                              <span className="meta-text">핵심어</span>
                              <span className="mt-1 block">{lesson.keywords.join(' · ')}</span>
                            </span>
                            <span className="block">
                              <span className="meta-text">확인 포인트</span>
                              <span className="mt-1 block">
                                {lesson.checkpoints.map((point) => (
                                  <span key={point} className="block">
                                    {point}
                                  </span>
                                ))}
                              </span>
                            </span>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
