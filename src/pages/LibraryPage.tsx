import { PageHeader } from '../components/ui'
import { ConceptExplorer } from '../components/library/ConceptExplorer'
import { TimelineExplorer } from '../components/library/TimelineExplorer'
import { useLibraryQuery } from '../components/library/useLibraryQuery'

export function LibraryPage() {
  const [query, update] = useLibraryQuery()

  return (
    <div className="library-page space-y-2">
      <PageHeader title="흐름으로 읽는 한국사">
        <p>시대와 사건을 연결해 보세요.</p>
        <div role="tablist" aria-label="자료실 구분" className="editorial-tabs mt-6">
          <TabButton
            selected={query.tab === 'timeline'}
            onClick={() => update({ tab: 'timeline' })}
          >
            연표
          </TabButton>
          <TabButton
            selected={query.tab === 'concepts'}
            onClick={() => update({ tab: 'concepts' })}
          >
            개념
          </TabButton>
        </div>
      </PageHeader>

      {query.tab === 'concepts' ? (
        <ConceptExplorer
          era={query.era}
          q={query.q}
          sort={query.sort}
          onEraChange={(era) => update({ era })}
          onQueryChange={(q) => update({ q })}
          onSortChange={(sort) => update({ sort })}
          onReset={() => update({ era: 'all', q: '', sort: 'asc' })}
        />
      ) : (
        <TimelineExplorer
          era={query.era}
          q={query.q}
          sort={query.sort}
          onEraChange={(era) => update({ era })}
          onQueryChange={(q) => update({ q })}
          onSortChange={(sort) => update({ sort })}
          onReset={() => update({ era: 'all', q: '', sort: 'asc' })}
        />
      )}
    </div>
  )
}

function TabButton({
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
      role="tab"
      aria-selected={selected}
      className={`btn btn-text rounded-none px-3 ${
        selected ? 'font-bold text-[var(--accent)] shadow-[inset_0_-2px_0_0_var(--accent)]' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
