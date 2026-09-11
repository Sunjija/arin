import { COURSE_CONCEPT_IDS, COURSE_VERSION } from '../data/courseOrder'
import { addDays, daysBetween, isDateKey } from './dates'
import { countStudyDaysInclusive, isStudyWeekday, projectConceptFinishDate, reviewPeriodStart } from './goalSchedule'
import type { Concept, ConceptProgressRecord, LearningGoal, ConceptSchedule } from '../types'


export function orderedConcepts(concepts: Concept[]): Concept[] {
  const rank = new Map(COURSE_CONCEPT_IDS.map((id, i) => [id, i]))
  return [...concepts].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
}

export function buildConceptSchedule(input: { today: string; goal: LearningGoal; concepts: Concept[]; progress: ConceptProgressRecord[] }): ConceptSchedule {
  const { today, goal, progress } = input
  if (!isDateKey(today)) throw new Error('학습 날짜가 올바르지 않습니다.')
  const concepts = orderedConcepts(input.concepts)
  const done = new Set(progress.filter(row => row.learnState === 'completed').map(row => row.conceptId))
  const remaining = concepts.filter(concept => !done.has(concept.id))
  const ready = (concept: Concept) => Boolean(concept.summary.trim() && concept.source)
  const readyRemaining = remaining.filter(ready)
  const targetDate = goal.conceptTargetDate ?? (!goal.examDateUndecided && goal.examDate ? addDays(reviewPeriodStart(goal.examDate)!, -1) : addDays(goal.startDate, goal.planWeeks * 7 - 1))
  const from = today > goal.startDate ? today : goal.startDate
  const studyDaysLeft = countStudyDaysInclusive(from, targetDate, goal.studyWeekdays)
  const recommendedPerDay = remaining.length === 0 ? 0 : studyDaysLeft > 0 ? Math.ceil(remaining.length / studyDaysLeft) : null
  const selectedPerDay = Math.min(20, Math.max(1, goal.paceMode === 'manual' ? goal.dailyNewConceptCount : recommendedPerDay ?? goal.dailyNewConceptCount))
  const isStudyDay = today >= goal.startDate && isStudyWeekday(today, goal.studyWeekdays)
  const prefix: Concept[] = []
  for (const concept of remaining) { if (!ready(concept)) break; prefix.push(concept) }
  const blocked = remaining.find(concept => !ready(concept))
  const warnings: string[] = []
  if (remaining.length && !studyDaysLeft) warnings.push('개념 목표일까지 남은 학습일이 없습니다. 목표일이나 학습 요일을 조정해 주세요.')
  if ((recommendedPerDay ?? 0) > 20) warnings.push(`목표를 맞추려면 하루 ${recommendedPerDay}개가 필요합니다. 현재 상한은 20개이므로 목표일 조정이 필요합니다.`)
  if (goal.paceMode === 'manual' && recommendedPerDay != null && selectedPerDay < recommendedPerDay) warnings.push(`현재 분량은 하루 ${selectedPerDay}개이며 목표일을 맞추려면 ${recommendedPerDay}개가 필요합니다.`)
  if (blocked) warnings.push(`상세 설명이 준비되지 않은 개념이 ${remaining.length - readyRemaining.length}개 있습니다. ${blocked.title}부터는 준비를 기다리며 다음 개념으로 건너뛰지 않습니다.`)
  if (!isStudyDay && remaining.length) warnings.push(today < goal.startDate ? `학습 시작일은 ${goal.startDate}입니다.` : '오늘은 쉬는 날입니다. 진행 중인 학습은 이어갈 수 있습니다.')
  if (goal.examDate && !goal.examDateUndecided && daysBetween(today, goal.examDate) < 0) warnings.push('시험일이 지났습니다. 시험일을 다시 설정해 주세요.')
  if (goal.examDate && !goal.examDateUndecided && targetDate >= goal.examDate) warnings.push('개념 목표일이 시험일보다 빠르지 않습니다. 최종 복습 시간을 확보해 주세요.')
  const project = (count: number) => projectConceptFinishDate({ today: from, remainingLessonCount: count, dailyNewLessons: selectedPerDay, studyWeekdays: goal.studyWeekdays })
  return {
    courseVersion: COURSE_VERSION, totalConcepts: concepts.length, completedConcepts: concepts.length - remaining.length,
    remainingConcepts: remaining.length, readyRemainingConcepts: readyRemaining.length,
    unavailableConcepts: remaining.length - readyRemaining.length, targetDate, studyDaysLeft, recommendedPerDay, selectedPerDay,
    availableTodayIds: isStudyDay ? prefix.slice(0, selectedPerDay).map(concept => concept.id) : [],
    nextConceptId: remaining[0]?.id ?? null, blockedConceptId: blocked?.id ?? null, isStudyDay,
    readyContentFinishDate: prefix.length ? project(prefix.length) : null,
    allContentReadyFinishDate: blocked ? null : project(remaining.length), warnings,
  }
}
