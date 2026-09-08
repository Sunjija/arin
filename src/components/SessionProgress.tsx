export function SessionProgress({
  stepLabel,
  current,
  total,
}: {
  stepLabel: string
  current?: number
  total?: number
}) {
  const hasCount = current != null && total != null && total > 0
  const shown = hasCount ? Math.min(Math.max(current, 1), total) : current
  const label = hasCount ? `${stepLabel} ${shown}/${total}` : stepLabel

  return (
    <p className="meta-text whitespace-nowrap" aria-live="polite">
      {label}
    </p>
  )
}
