import type { LessonGuide } from '../../types'

export function LessonGuideContent({ guide, confirmedIds, onConfirm, disabled }: {
  guide: LessonGuide
  confirmedIds?: string[]
  onConfirm?: (id: string, checked: boolean) => void
  disabled?: boolean
}) {
  return <section className="concept-lesson-guide space-y-6" aria-label="단원 개념 설명">
    <p className="concept-summary">{guide.introduction}</p>
    {guide.sections.map((section, index) => <section className="space-y-3" key={section.conceptId}>
      <h3>{index + 1}. {section.title}</h3>
      {section.paragraphs.map((paragraph) => <p className="concept-summary" key={paragraph}>{paragraph}</p>)}
      <details className="rounded-xl bg-[var(--accent-soft)]/40 p-4">
        <summary className="cursor-pointer font-medium">스스로 확인 · {section.recallPrompt}</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">{section.expectedElements.map((element) => <li key={element}>{element}</li>)}</ul>
      </details>
      {onConfirm && <label className="flex items-start gap-3 py-2 text-sm font-medium">
        <input className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" type="checkbox" checked={confirmedIds?.includes(section.conceptId) ?? false} disabled={disabled} onChange={event => onConfirm(section.conceptId, event.target.checked)} />
        <span>확인 질문에 내 말로 답해 봤어요</span>
      </label>}
      <a className="meta-text underline underline-offset-4" href={section.sourceUrl} target="_blank" rel="noreferrer">우리역사넷에서 관련 설명 읽기</a>
    </section>)}
  </section>
}
