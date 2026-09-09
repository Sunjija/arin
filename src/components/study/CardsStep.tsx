import { useRef, useState } from 'react'
import { Button, InlineStatus } from '../ui'
import { Dolmen } from '../DesignArtwork'
import { calculateNextInterval } from '../../lib/spacedRepetition'
import { ERA_LABELS, type ActiveSession, type CardRating, type FlashcardRecord } from '../../types'

const RATINGS: { value: CardRating; label: string }[] = [
  { value: 'again', label: '다시' }, { value: 'hard', label: '어려움' },
  { value: 'good', label: '알겠어요' }, { value: 'easy', label: '쉬워요' },
]

export function CardsStep({ session, cards, onAdvance, onSkip }: {
  session: ActiveSession
  cards: FlashcardRecord[]
  onAdvance: (rating: CardRating, requeue: boolean) => Promise<void>
  onSkip: () => Promise<void>
}) {
  const card = cards[session.cardIndex]
  const [revealed, setRevealed] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  if (!card) return <div className="surface p-5" aria-live="polite"><h1 className="section-title">복습할 카드 없음</h1><Button className="mt-4 w-full" onClick={() => void onSkip()}>{session.entryMode === 'review' ? '복습 마치기' : '개념 시작'}</Button></div>

  const advance = async (rating: CardRating) => {
    if (lock.current) return
    lock.current = true
    setAdvancing(true)
    setError(null)
    try { await onAdvance(rating, rating === 'again') }
    catch (reason) { setError(reason instanceof Error ? reason.message : '복습을 저장하지 못했습니다. 다시 시도해 주세요.') }
    finally { lock.current = false; setAdvancing(false) }
  }

  return <div className="recall-page">
    <p className="recall-era">{ERA_LABELS[card.era]}</p>
    <article className="recall-card" aria-live="polite">
      <span className={`pill ${revealed ? 'green' : 'blue'}`}>{revealed ? '정답' : '기억해 보기'}</span>
      {revealed ? <>
        <h1 className="sr-only">카드 정답</h1>
        <p className="recall-answer">{card.back}</p>
        {card.era === 'prehistoric' && card.back.includes('고인돌') && <Dolmen className="recall-art" />}
        <p>{card.front}</p>
      </> : <>
        <p className="recall-prompt">{card.kind === 'king-to-deed' ? '이 인물의 대표 업적은?' : card.kind === 'deed-to-king' ? '이 업적을 남긴 인물은?' : card.kind === 'chronology' ? '사건의 순서를 떠올려 보세요.' : '이 개념을 설명해 보세요.'}</p>
        <h1>{card.front}</h1>
        <p>속으로 답을 떠올린 뒤 확인해 보세요.</p>
      </>}
      <footer>{String(session.cardIndex + 1).padStart(2, '0')} / {ERA_LABELS[card.era]}</footer>
    </article>
    <section className="recall-actions">
      {revealed ? <>
        <h2>얼마나 잘 떠올랐나요?</h2>
        <p className="meta-text">평가에 따라 다음 복습 시점이 달라집니다.</p>
        <div className="rating-grid" role="group" aria-label="기억 평가">
          {RATINGS.map(({value, label}) => <button key={value} type="button" className={`rating-${value}`} disabled={advancing} onClick={() => void advance(value)}>
            {label}<small>{calculateNextInterval(value, card).nextIntervalDays}일 뒤</small>
          </button>)}
        </div>
        <p className="meta-text">‘다시’를 고르면 오늘 분량에 여유가 있을 때 한 번 더 만납니다.</p>
      </> : <>
        <Button onClick={() => setRevealed(true)}>정답 보기</Button>
        <Button variant="text" className="mt-3" onClick={() => setRevealed(true)}>모르겠어요</Button>
        <p className="meta-text text-center mt-3">모르는 카드도 다음 복습에서 다시 만납니다.</p>
      </>}
      {advancing && <p className="meta-text" role="status">저장 중…</p>}
      {error && <InlineStatus tone="error">{error}</InlineStatus>}
    </section>
  </div>
}
