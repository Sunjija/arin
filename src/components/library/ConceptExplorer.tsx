import { LessonPractice } from './LessonPractice'
import { guideForLesson } from '../../data/lessonGuides'
import { LessonGuideContent } from '../study/LessonGuideContent'
import { useState } from 'react'
import { lessons } from '../../data/lessons'
import { ERA_LABELS } from '../../types'
import { EmptyResults } from './EmptyResults'
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
  const selected = filtered.find((lesson) => lesson.id === openId) ?? filtered[0]
  const guide = selected ? guideForLesson(selected.id) : undefined

  return (
    <div className="space-y-2">
      <LibraryFilters
        era={era}
        q={q}
        sort={sort}
        searchLabel="개념 검색"
        searchPlaceholder="단원·키워드 검색"
        resultCount={filtered.length}
        onEraChange={onEraChange}
        onQueryChange={onQueryChange}
        onSortChange={onSortChange}
      />
      {filtered.length === 0 ? (
        <EmptyResults
          title="해당하는 단원이 없습니다."
          canClearQuery={Boolean(q.trim())}
          onClearQuery={() => onQueryChange('')}
          onReset={onReset}
        />
      ) : (
        <div className="concept-browser">
          <nav className="concept-index" aria-label="개념 단원 목록">
            {groups.map((group) => (
              <section key={group.era}>
                <h2>{ERA_LABELS[group.era]}</h2>
                {group.lessons.map((lesson) => (
                  <button key={lesson.id} type="button"
                    aria-current={selected.id === lesson.id ? 'true' : undefined}
                    onClick={() => setOpenId(lesson.id)}>
                    <span>{lesson.title}</span><span aria-hidden="true">→</span>
                  </button>
                ))}
              </section>
            ))}
          </nav>
          <article className="concept-reader" aria-label={selected.title}>
            <header>
              <p className="meta-text">{ERA_LABELS[selected.era]} · 핵심 개념</p>
              <h2>{selected.title}</h2>
              <p className="concept-summary">{selected.summary}</p>
            </header>
            <section className="concept-keywords">
              <h3>기억할 핵심어</h3>
              <ul>{selected.keywords.map((word) => <li key={word}>{word}</li>)}</ul>
            </section>
            {guide && <LessonGuideContent guide={guide} />}
            <section>
              <h3>이렇게 구분하세요</h3>
              <ol className="concept-points">
                {selected.checkpoints.map((point, index) => {
                  const separator = point.indexOf(':')
                  return <li key={point}>
                    <span className="concept-point-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div>{separator > 0 ? <><h4>{point.slice(0, separator)}</h4><p>{point.slice(separator + 1).trim()}</p></> : <p>{point}</p>}</div>
                  </li>
                })}
              </ol>
            </section>
            <LessonPractice key={selected.id} lessonId={selected.id} />
          </article>
        </div>
      )}
    </div>
  )
}
