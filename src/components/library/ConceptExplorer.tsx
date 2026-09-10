import { LessonPractice } from './LessonPractice'
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
            {selected.id === 'lesson-01' ? (
              <section className="concept-lesson-guide">
                <h3>한 번에 잡는 흐름</h3>
                <div className="concept-flow">
                  <div><strong>신석기</strong><span>빗살무늬토기 · 농경 · 정착</span></div>
                  <div><strong>청동기</strong><span>비파형동검 · 고인돌 · 군장 사회</span></div>
                  <div><strong>고조선</strong><span>단군 전승 · 위만 집권 · 8조법</span></div>
                </div>
                <p className="meta-text">유물은 시대를, 제도는 사회 모습을 묻는 단서로 활용하세요.</p>
                <h4 className="mt-5 font-bold">농경과 정착에서 계층의 등장으로</h4>
                <p className="concept-summary">신석기 시대에는 농경과 목축이 시작되었고, 사냥·채집·고기잡이도 계속되었습니다. 빗살무늬토기는 이 시대를 알아보는 대표 단서입니다. 농경이나 정착이라는 말 하나만으로 청동기라고 판단하지 마세요.</p>
                <p className="concept-summary mt-3">청동기 시대에는 농경이 발달하고 빈부 차이와 계층 분화가 나타났습니다. 고인돌과 비파형동검은 지배층의 존재를 읽는 단서입니다. 청동기가 등장했다고 모든 생활 도구가 청동으로 바뀐 것은 아닙니다.</p>
                <h4 className="mt-5 font-bold">고조선: 건국 전승·집권·법을 나누어 보기</h4>
                <p className="concept-summary">단군은 건국 전승, 위만은 고조선 후기에 왕위를 차지한 인물과 연결합니다. 8조법은 생명과 재산을 중시한 사회 모습을 보여 줍니다. 한 군현은 고조선이 멸망한 뒤 설치되었으므로 사건의 앞뒤를 구분해야 합니다.</p>
              </section>
            ) : null}
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
            {selected.id === 'lesson-01' && <LessonPractice key={selected.id} lessonId={selected.id} />}
          </article>
        </div>
      )}
    </div>
  )
}
