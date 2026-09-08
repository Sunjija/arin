import { PageHeader } from '../components/ui'
import { ConceptExplorer } from '../components/library/ConceptExplorer'
import { TimelineExplorer } from '../components/library/TimelineExplorer'
import { useLibraryQuery } from '../components/library/useLibraryQuery'

export function LibraryPage() {
  const [query, update] = useLibraryQuery()

  return (
    <div className="space-y-3 [&_.page-header]:mb-2">
      <PageHeader title="자료실">
        <div role="tablist" aria-label="자료실 구분" className="mt-3 flex gap-1">
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
      className={`btn btn-text px-3 ${selected ? 'font-bold text-[var(--ink)]' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
