import { useState } from 'react'
import { Button, InlineStatus } from '../ui'
import { ERA_LABELS, type Lesson, type LessonGuide } from '../../types'
import { guideForLesson } from '../../data/lessonGuides'
import { LessonGuideContent } from './LessonGuideContent'

export function ConceptStep({
  lesson,
  memo,
  onMemo,
  onDone,
  guideSnapshots,
  confirmedConceptIds = [],
  onConfirm,
  questionCount,
}: {
  lesson: Lesson
  memo: string
  onMemo: (value: string) => Promise<void>
  onDone: () => Promise<void>
  guideSnapshots?: LessonGuide[]
  confirmedConceptIds?: string[]
  onConfirm?: (id: string, checked: boolean) => Promise<void>
  questionCount?: number
}) {
  const guide = guideForLesson(lesson.id)
  const guides = guideSnapshots ?? (guide ? [guide] : [])
  const scoped = guideSnapshots !== undefined
  const ids = guides.flatMap(item => item.sections.map(section => section.conceptId))
  const allConfirmed = !scoped || ids.length > 0 && ids.every(id => confirmedConceptIds.includes(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try { await action(); setError(null) }
    catch { setError('진행을 저장하지 못했습니다. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return (
    <div className="concept-content space-y-4">
      <div>
        <p className="meta-text">
          {scoped ? `오늘 개념 ${ids.length}개` : `${ERA_LABELS[lesson.era]} · 오늘 단원 읽기`}
        </p>
        <h1 className="font-display text-2xl">{scoped ? '흐름을 읽고, 내 말로 설명해 봐요' : lesson.title}</h1>
        <p className="mt-2 text-[var(--ink-muted)]">{scoped ? '설명을 읽고 확인 질문에 답해 보세요. 답변 예시와 비교한 뒤 체크하면 다음 단계로 이어집니다.' : lesson.summary}</p>
      </div>
      {guides.map((item, index) => <LessonGuideContent key={`${item.lessonId}-${index}`} guide={item} confirmedIds={confirmedConceptIds} disabled={busy} onConfirm={onConfirm ? (id, checked) => void run(() => onConfirm(id, checked)) : undefined} />)}
      {!scoped && <>
      <div>
        <h2 className="font-semibold">핵심 키워드</h2>
        <p className="mt-1 text-[var(--ink)]">{lesson.keywords.join(' · ')}</p>
      </div>
      <div>
        <h2 className="font-semibold">반드시 구분할 체크포인트</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {lesson.checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      </>}
      <label className="block">
        <span className="text-sm font-medium">교재·강의 범위 메모 (선택)</span>
        <textarea
          className="field-control mt-1"
          rows={3}
          value={memo}
          onChange={(event) => void onMemo(event.target.value).catch(() => setError('메모를 저장하지 못했습니다.'))}
          placeholder="예: 자습서 고려 광종·성종 단원 p.42~45"
        />
      </label>
      {error && <InlineStatus tone="error">{error}</InlineStatus>}
      {scoped && <p className="meta-text">확인 {ids.filter(id => confirmedConceptIds.includes(id)).length}/{ids.length}개 · 읽기 확인은 숙련도 측정과 별도로 기록합니다.</p>}
      <div className="cta-dock">
        <Button className="w-full" disabled={busy || !allConfirmed} onClick={() => void run(onDone)}>
          {questionCount === 0 ? '개념 확인 완료 · 다음으로' : '읽기 완료 · 확인 문제 풀기'}
        </Button>
      </div>
    </div>
  )
}
