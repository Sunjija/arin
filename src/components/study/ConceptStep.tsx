import { Button } from '../ui'
import { ERA_LABELS, type Lesson } from '../../types'
import { guideForLesson } from '../../data/lessonGuides'
import { LessonGuideContent } from './LessonGuideContent'

export function ConceptStep({
  lesson,
  memo,
  onMemo,
  onDone,
}: {
  lesson: Lesson
  memo: string
  onMemo: (value: string) => Promise<void>
  onDone: () => Promise<void>
}) {
  const guide = guideForLesson(lesson.id)
  return (
    <div className="concept-content space-y-4">
      <div>
        <p className="meta-text">
          {ERA_LABELS[lesson.era]} · 오늘 단원 읽기
        </p>
        <h1 className="font-display text-2xl">{lesson.title}</h1>
        <p className="mt-2 text-[var(--ink-muted)]">{lesson.summary}</p>
      </div>
      {guide && <LessonGuideContent guide={guide} />}
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
      <label className="block">
        <span className="text-sm font-medium">교재·강의 범위 메모 (선택)</span>
        <textarea
          className="field-control mt-1"
          rows={3}
          value={memo}
          onChange={(event) => void onMemo(event.target.value)}
          placeholder="예: 자습서 고려 광종·성종 단원 p.42~45"
        />
      </label>
      <div className="cta-dock">
        <Button className="w-full" onClick={() => void onDone()}>
          읽기 완료 · 맞춤 문제 풀기
        </Button>
      </div>
    </div>
  )
}
