import type { LessonGuide } from '../../types'

export function LessonGuideContent({ guide }: { guide: LessonGuide }) {
  return <section className="concept-lesson-guide space-y-6" aria-label="단원 개념 설명">
    <p className="concept-summary">{guide.introduction}</p>
    {guide.sections.map((section, index) => <section className="space-y-3" key={section.conceptId}>
      <h3>{index + 1}. {section.title}</h3>
      {section.paragraphs.map((paragraph) => <p className="concept-summary" key={paragraph}>{paragraph}</p>)}
      <details className="rounded-xl bg-[var(--accent-soft)]/40 p-4">
        <summary className="cursor-pointer font-medium">스스로 확인 · {section.recallPrompt}</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">{section.expectedElements.map((element) => <li key={element}>{element}</li>)}</ul>
      </details>
      <a className="meta-text underline underline-offset-4" href={section.sourceUrl} target="_blank" rel="noreferrer">우리역사넷에서 관련 설명 읽기</a>
    </section>)}
  </section>
}
