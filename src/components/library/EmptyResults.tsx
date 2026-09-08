import { Button, EmptyState } from '../ui'

export function EmptyResults({
  title,
  onClearQuery,
  onReset,
  canClearQuery,
}: {
  title: string
  onClearQuery: () => void
  onReset: () => void
  canClearQuery: boolean
}) {
  return (
    <EmptyState title={title}>
      <div className="flex flex-wrap gap-2">
        {canClearQuery ? (
          <Button variant="text" onClick={onClearQuery}>
            지우기
          </Button>
        ) : null}
        <Button variant="text" onClick={onReset}>
          초기화
        </Button>
      </div>
    </EmptyState>
  )
}
