import type { StimulusSpec } from '../../types'

function authenticityLabel(authenticity: StimulusSpec['authenticity']): string {
  if (authenticity === 'quoted') return '인용 자료'
  if (authenticity === 'original-visual') return '자체 제작 도식'
  return '학습용 재구성 자료 (원문 사료 아님)'
}

function DocumentBody({ stimulus }: { stimulus: StimulusSpec }) {
  return (
    <>
      {stimulus.body ? <p className="passage-text whitespace-pre-line">{stimulus.body}</p> : null}
      {stimulus.rows?.length ? (
        <dl className="stimulus-catalog">
          {stimulus.rows.map((row) => (
            <div key={row.label} className="stimulus-catalog-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  )
}

export function StimulusBlock({
  stimulus,
  passage,
}: {
  stimulus?: StimulusSpec
  passage?: string
}) {
  if (!stimulus) {
    if (!passage) return null
    return (
      <blockquote className="passage-text rounded-xl bg-[var(--accent-soft)]/50 p-4 whitespace-pre-line">
        {passage}
      </blockquote>
    )
  }

  const label = authenticityLabel(stimulus.authenticity)
  const srText = stimulus.altText ?? stimulus.caption

  return (
    <figure className="stimulus-card" aria-label={stimulus.title ?? '자료'}>
      <div className="stimulus-head">
        <span className="stimulus-badge">{label}</span>
        {stimulus.title ? <figcaption className="stimulus-title">{stimulus.title}</figcaption> : null}
      </div>
      {srText ? <p className="sr-only">{srText}</p> : null}

      {stimulus.kind === 'table' && stimulus.columns && stimulus.table ? (
        <div className="stimulus-scroll">
          <table className="stimulus-table">
            <caption className="sr-only">{stimulus.altText ?? stimulus.title ?? '비교표'}</caption>
            <thead>
              <tr>
                {stimulus.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stimulus.table.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {stimulus.kind === 'timeline' && stimulus.events ? (
        <ol className="stimulus-timeline">
          {stimulus.events.map((event, index) => (
            <li key={`${event.marker ?? event.year ?? 'e'}-${index}`}>
              <span className="stimulus-marker">{event.marker ?? event.year ?? index + 1}</span>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {stimulus.kind === 'dialogue' && stimulus.dialogue ? (
        <ol className="stimulus-dialogue">
          {stimulus.dialogue.map((line, index) => (
            <li key={`${line.speaker}-${index}`}>
              <span className="stimulus-speaker">{line.speaker}</span>
              <span>{line.line}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {stimulus.kind === 'diagram' && stimulus.diagramText ? (
        <pre className="stimulus-diagram">{stimulus.diagramText}</pre>
      ) : null}

      {stimulus.kind === 'table' || stimulus.kind === 'timeline' || stimulus.kind === 'dialogue' || stimulus.kind === 'diagram' ? null : (
        <div className={stimulus.kind === 'newspaper' ? 'stimulus-newspaper' : undefined}>
          <DocumentBody stimulus={stimulus} />
        </div>
      )}

      {stimulus.caption ? <p className="meta-text mt-2">{stimulus.caption}</p> : null}
    </figure>
  )
}
