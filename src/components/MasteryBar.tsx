type Props = {
  value: number
  label?: string
}

export function MasteryBar({ value, label }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{label}</span>
          <span className="tabular-nums text-[var(--ink-muted)]">{safe}</span>
        </div>
      ) : null}
      <div className="meter" role="meter" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}
