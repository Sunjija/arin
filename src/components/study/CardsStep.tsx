import { useEffect, useRef, useState } from 'react'
import { Button, ChoiceOption } from '../ui'
import { buildCardChoiceSet, ratingFromQuizResult, type CardChoiceSet } from '../../lib/cardQuiz'
import { ERA_LABELS, type ActiveSession, type CardRating, type FlashcardRecord } from '../../types'
import { choiceState } from './choiceState'

export function CardsStep({
  session,
  cards,
  pool,
  onAdvance,
  onSkip,
}: {
  session: ActiveSession
  cards: FlashcardRecord[]
  pool: FlashcardRecord[]
  onAdvance: (rating: CardRating, requeue: boolean) => Promise<void>
  onSkip: () => Promise<void>
}) {
  const card = cards[session.cardIndex]
  const [choiceSet] = useState<CardChoiceSet | null>(() =>
    card ? buildCardChoiceSet(card, pool.length ? pool : cards) : null,
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [pendingReview, setPendingReview] = useState<{
    rating: CardRating
    requeue: boolean
  } | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const startedAt = useRef(0)
  const locked = useRef(false)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  const review = session.entryMode === 'review'
  const lastCard = session.cardIndex + 1 >= session.cardIds.length

  const gradeChoice = (index: number) => {
    if (!choiceSet || choiceSet.mode !== 'choices' || revealed || locked.current) return
    locked.current = true
    setSelected(index)
    setRevealed(true)
    const correct = index === choiceSet.answerIndex
    const rating = ratingFromQuizResult(correct, Date.now() - startedAt.current)
    setPendingReview({ rating, requeue: !correct })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!choiceSet || choiceSet.mode !== 'choices' || revealed) return
      const num = Number(event.key)
      if (num >= 1 && num <= choiceSet.choices.length) {
        event.preventDefault()
        gradeChoice(num - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card || !choiceSet) {
    return (
      <div className="surface p-5">
        <h1 className="section-title">복습할 카드 없음</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          {review ? '오늘 복습 목록으로 돌아갑니다.' : '개념 읽기로 넘어갑니다.'}
        </p>
        <Button className="mt-4 w-full" onClick={() => void onSkip()}>
          {review ? '복습 마치기' : '개념 시작'}
        </Button>
      </div>
    )
  }

  const nextLabel = () => {
    if (advancing) return '저장 중…'
    if (lastCard && !pendingReview?.requeue) {
      return review ? '카드 완료 · 복습으로' : '카드 완료 · 개념 읽기로'
    }
    return '다음 카드'
  }

  const advance = async (rating: CardRating, requeue: boolean) => {
    if (advancing) return
    setAdvancing(true)
    try {
      await onAdvance(rating, requeue)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">
          {choiceSet.kindLabel}
          {card.era ? ` · ${ERA_LABELS[card.era]}` : ''}
        </p>
        <p className="mb-2 text-sm text-[var(--ink-muted)]">{choiceSet.ask}</p>
        <h1 className="font-display text-xl leading-relaxed sm:text-2xl">{choiceSet.prompt}</h1>
      </div>

      {choiceSet.mode === 'choices' ? (
        <div className="space-y-2" role="group" aria-label="선택지">
          {choiceSet.choices.map((choice, index) => (
            <ChoiceOption
              key={`${choice}-${index}`}
              index={index}
              label={choice}
              state={choiceState({
                index,
                selected,
                revealed,
                answerIndex: choiceSet.answerIndex,
              })}
              onSelect={() => gradeChoice(index)}
              aria-label={`${index + 1}번 ${choice}`}
            />
          ))}
        </div>
      ) : (
        <div className="surface space-y-3 p-5">
          <p className="text-[var(--ink-muted)]">같은 종류의 선지 후보가 부족합니다. 떠올린 뒤 정답을 확인하세요.</p>
          {revealed ? (
            <p className="passage-text whitespace-pre-line">{choiceSet.answerText}</p>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                if (locked.current) return
                locked.current = true
                setRevealed(true)
              }}
            >
              정답 확인
            </Button>
          )}
          {revealed ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={advancing} onClick={() => void advance('good', false)}>
                맞음
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={advancing}
                onClick={() => void advance('hard', false)}
              >
                헷갈림
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={advancing}
                onClick={() => void advance('again', true)}
              >
                모름
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {choiceSet.mode === 'choices' && revealed && pendingReview ? (
        <div className="cta-dock">
          <Button
            className="w-full"
            disabled={advancing}
            onClick={() => void advance(pendingReview.rating, pendingReview.requeue)}
          >
            {nextLabel()}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
