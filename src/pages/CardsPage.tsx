import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, EmptyState, InlineStatus, PageHeader } from '../components/ui'
import { db } from '../db/database'
import { addDays, isDue, toDateKey } from '../lib/dates'
import { addCardFromContent, buildTodayPlan, startOrResumeSession } from '../lib/studyService'
import { createWrongCardFromQuestion, updateCardContent } from '../lib/wrongCard'
import {
  ALL_ERAS,
  ERA_LABELS,
  WRONG_CAUSE_LABELS,
  type ActiveSession,
  type TodayPlan,
  type EraId,
  type FlashcardRecord,
  type WrongAnswerRecord,
} from '../types'

type MainTab = 'due' | 'all' | 'wrong'
type KindFilter = 'all' | 'king' | 'chrono' | 'from-wrong'

export function CardsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<MainTab>('due')
  const [cards, setCards] = useState<FlashcardRecord[]>([])
  const [wrong, setWrong] = useState<WrongAnswerRecord[]>([])
  const [query, setQuery] = useState('')
  const [era, setEra] = useState<EraId | 'all'>('all')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [hardOnly, setHardOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [draft, setDraft] = useState({ front: '', back: '', era: 'goryeo' as EraId })
  const [editing, setEditing] = useState<{ id: string; front: string; back: string } | null>(null)
  const [starting, setStarting] = useState(false)
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveSession | undefined>()
  const [weekDays, setWeekDays] = useState(0)

  useEffect(() => {
    let alive = true
    void Promise.all([buildTodayPlan(), db.activeSession.toCollection().first(), db.studyDays.toArray()])
      .then(([nextPlan, active, days]) => {
        if (!alive) return
        setPlan(nextPlan); setActiveSession(active)
        setWeekDays(days.filter(day => day.date >= addDays(toDateKey(), -6) && day.date <= toDateKey() && (day.cardsReviewed > 0 || day.questionsAnswered > 0 || day.conceptDone)).length)
      }).catch(() => { if (alive) { setMessage('복습 계획을 불러오지 못했습니다. 새로고침해 주세요.'); setMessageTone('error') } })
    return () => { alive = false }
  }, [])

  const load = async () => {
    const [loadedCards, loadedWrong] = await Promise.all([
      db.cards.toArray(),
      db.wrongAnswers.orderBy('createdAt').reverse().toArray(),
    ])
    setCards(loadedCards)
    setWrong(loadedWrong)
  }

  useEffect(() => {
    let active = true
    void Promise.all([
      db.cards.toArray(),
      db.wrongAnswers.orderBy('createdAt').reverse().toArray(),
    ]).then(([loadedCards, loadedWrong]) => {
      if (!active) return
      setCards(loadedCards)
      setWrong(loadedWrong)
    })
    return () => {
      active = false
    }
  }, [])

  const today = toDateKey()
  const dueCards = useMemo(
    () => cards.filter((card) => isDue(card.nextReviewAt, today)),
    [cards, today],
  )

  const filtered = useMemo(() => {
    let list = tab === 'due' ? [...dueCards] : [...cards]
    if (kindFilter === 'king') {
      list = list.filter((card) => card.kind === 'king-to-deed' || card.kind === 'deed-to-king')
    }
    if (kindFilter === 'chrono') list = list.filter((card) => card.kind === 'chronology')
    if (kindFilter === 'from-wrong') list = list.filter((card) => card.fromWrongAnswer)
    if (era !== 'all') list = list.filter((card) => card.era === era)
    if (hardOnly) {
      list = list.filter((card) => card.lastRating === 'again' || card.lastRating === 'hard' || card.lapses > 0)
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase()
      list = list.filter(
        (card) => card.front.toLowerCase().includes(needle) || card.back.toLowerCase().includes(needle),
      )
    }
    return list.sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
  }, [cards, dueCards, tab, era, hardOnly, query, kindFilter])

  const notify = (text: string, tone: 'success' | 'error' | 'neutral' = 'neutral') => {
    setMessage(text)
    setMessageTone(tone)
  }

  const startReview = async () => {
    if (starting) return
    setStarting(true)
    try {
      const session = await startOrResumeSession({ entryMode: 'review' })
      if (session.entryMode === 'review' && (session.step === 'result' || session.cardIds.length === 0)) {
        notify('오늘 복습할 카드가 없습니다. 아래 목록만 확인할 수 있습니다.', 'neutral')
        return
      }
      navigate('/study', { state: { entryMode: session.entryMode ?? 'review' } })
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '복습을 시작하지 못했습니다.', 'error')
    } finally {
      setStarting(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.front.trim() || !editing.back.trim()) {
      notify('앞면과 뒷면을 모두 입력하세요.', 'error')
      return
    }
    try {
      await updateCardContent({ cardId: editing.id, front: editing.front, back: editing.back })
      setEditing(null)
      notify('카드를 수정했습니다.', 'success')
      await load()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '카드를 수정하지 못했습니다.', 'error')
    }
  }

  const addFromWrong = async (item: WrongAnswerRecord) => {
    try {
      const result = await createWrongCardFromQuestion({ questionId: item.questionId })
      if (!result.ok) {
        setTab('all')
        setDraft({
          front: '',
          back: '',
          era: item.era,
        })
        notify(
          '원문 문항을 찾을 수 없어 카드를 만들지 않았습니다. 전체 카드에서 직접 작성해 주세요.',
          'error',
        )
        return
      }
      notify(result.created ? '카드로 추가했습니다.' : '이미 같은 카드가 있습니다.', 'success')
      await load()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : '카드를 만들지 못했습니다.', 'error')
    }
  }

  const ongoing = activeSession?.date === today && activeSession.step !== 'result' ? activeSession : null
  const sessionCards = ongoing ? ongoing.cardIds.slice(ongoing.cardIndex).flatMap(id => { const c = cards.find(item => item.id === id); return c ? [c] : [] }) : plan?.dueCards ?? []
  const selectedCount = ongoing ? Math.max(0, ongoing.cardIds.length - ongoing.cardIndex) : sessionCards.length
  const bundleEras = ALL_ERAS.filter(id => sessionCards.some(c => c.era === id))

  return (
    <div className="review-page space-y-5">
      <PageHeader title="기억을 오래 남기는 복습">
        <p className="mt-2 text-[var(--ink-muted)]">잊기 전에, 필요한 개념부터 다시 만나요.</p>
      </PageHeader>

      <section>
        <div className="editorial-tabs" role="tablist" aria-label="복습 목록">
          {(
            [
              ['due', '오늘'],
              ['all', '전체 카드'],
              ['wrong', '오답 기록'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`btn min-h-10 border-0 px-3 py-2 text-sm shadow-none ${
                tab === id ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {message ? <InlineStatus tone={messageTone}>{message}</InlineStatus> : null}

      {tab === 'due' ? (
        <section className="review-overview">
          <div className="review-summary">
            <div><p className="meta-text">오늘 복습할 카드</p><p className="review-count">{plan ? selectedCount : '—'}<small>장</small></p></div>
            <div className="week-ring" aria-label={`최근 7일 중 ${weekDays}일 학습`}>
              <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke="var(--line)" strokeWidth="5"/><circle cx="40" cy="40" r="35" fill="none" stroke="var(--correct)" strokeWidth="5" strokeDasharray={`${220 * weekDays / 7} 220`} transform="rotate(-90 40 40)" strokeLinecap="round" /></svg>
              <strong>{weekDays}/7</strong><span>주간 학습일</span>
            </div>
          </div>
          <p className="meta-text">{ongoing ? `진행 중인 학습 · 남은 카드 ${selectedCount}장` : `복습 대기 ${dueCards.length}장 중 오늘의 분량 ${selectedCount}장`}</p>
          {ongoing || selectedCount > 0 ? <Button className="hero-cta" disabled={starting || !plan} onClick={() => void startReview()}>
            {starting ? '시작하는 중…' : ongoing ? '진행 중인 학습 이어가기' : `${selectedCount}장 복습 시작`}
          </Button> : <EmptyState title={plan ? '오늘 복습을 모두 마쳤어요' : '복습 계획을 불러오는 중…'}>{plan ? '다음 복습일이 되면 필요한 카드가 여기에 모입니다.' : ''}</EmptyState>}
          {bundleEras.length > 0 && <div className="mt-8">
            <div className="section-heading"><h2>오늘의 복습 묶음</h2><span>시대별 카드</span></div>
            {bundleEras.map((id, index) => <div className="review-bundle" key={id}>
              <span className="bundle-index">{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{ERA_LABELS[id]}</h3><p>{sessionCards.some(c => c.era === id && c.fromWrongAnswer) ? '오답에서 다시 만나는 개념' : '이전 학습의 핵심 내용'}</p></div>
              <strong>{sessionCards.filter(c => c.era === id).length}장</strong>
            </div>)}
          </div>}
        </section>
      ) : null}

      {tab !== 'wrong' && (
        <details className="card-management" open={tab === 'all' ? true : undefined}><summary>카드 검색 · 관리</summary>
          <section className="surface space-y-3 p-4">
            <label className="block">
              <span className="sr-only">검색</span>
              <input
                className="field-control"
                placeholder="카드 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="field-control w-auto"
                value={era}
                onChange={(event) => setEra(event.target.value as EraId | 'all')}
                aria-label="시대 필터"
              >
                <option value="all">모든 시대</option>
                {ALL_ERAS.map((id) => (
                  <option key={id} value={id}>
                    {ERA_LABELS[id]}
                  </option>
                ))}
              </select>
              <Button variant="text" className="px-3" onClick={() => setFiltersOpen((open) => !open)}>
                {filtersOpen ? '보조 필터 접기' : '왕·업적 등 필터'}
              </Button>
            </div>
            {filtersOpen ? (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', '종류 전체'],
                    ['king', '왕·업적'],
                    ['chrono', '사건 순서'],
                    ['from-wrong', '오답에서 만든 카드'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`btn min-h-10 px-3 py-2 text-sm ${
                      kindFilter === id ? 'btn-secondary' : 'btn-ghost'
                    }`}
                    onClick={() => setKindFilter(id)}
                  >
                    {label}
                  </button>
                ))}
                <label className="btn btn-ghost min-h-10 px-3 py-2 text-sm">
                  <input type="checkbox" checked={hardOnly} onChange={(event) => setHardOnly(event.target.checked)} />
                  어려운 카드
                </label>
              </div>
            ) : null}
          </section>

          <section className="card-list space-y-3" aria-label={tab === 'due' ? '오늘 복습 카드 목록' : '전체 카드 목록'}>
            {filtered.length === 0 ? (
              <EmptyState title="해당하는 카드가 없습니다." />
            ) : (
              filtered.map((card) => (
                <article key={card.id} className="surface p-4">
                  <p className="meta-text">
                    {ERA_LABELS[card.era]} · 다음 복습 {card.nextReviewAt}
                    {card.fromWrongAnswer ? ' · 오답에서 생성' : ''}
                  </p>
                  <h2 className="mt-1 font-semibold whitespace-pre-line line-clamp-3">{card.front}</h2>
                  <p className="mt-1 text-[var(--ink-muted)] whitespace-pre-line line-clamp-3">{card.back}</p>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="text"
                      className="px-2"
                      onClick={() => setEditing({ id: card.id, front: card.front, back: card.back })}
                    >
                      수정
                    </Button>
                    <Button
                      variant="text"
                      className="px-2 text-[var(--wrong)]"
                      onClick={async () => {
                        if (!window.confirm('이 카드를 삭제할까요?')) return
                        await db.cards.delete(card.id)
                        await load()
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>
        </details>
      )}

      {tab === 'all' ? (
        <section className="surface space-y-3 p-5">
          <div>
            <p className="eyebrow">새 카드</p>
            <h2 className="section-title mt-1">카드 직접 추가</h2>
          </div>
          <input
            className="field-control"
            placeholder="앞면"
            value={draft.front}
            onChange={(event) => setDraft({ ...draft, front: event.target.value })}
          />
          <input
            className="field-control"
            placeholder="뒷면"
            value={draft.back}
            onChange={(event) => setDraft({ ...draft, back: event.target.value })}
          />
          <select
            className="field-control"
            value={draft.era}
            onChange={(event) => setDraft({ ...draft, era: event.target.value as EraId })}
            aria-label="시대"
          >
            {ALL_ERAS.map((id) => (
              <option key={id} value={id}>
                {ERA_LABELS[id]}
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            onClick={async () => {
              if (!draft.front.trim() || !draft.back.trim()) return
              const { created } = await addCardFromContent({
                front: draft.front,
                back: draft.back,
                kind: 'concept',
                era: draft.era,
                tags: ['king-figure'],
              })
              notify(created ? '카드를 추가했습니다.' : '중복 카드라 추가하지 않았습니다.', 'success')
              setDraft({ front: '', back: '', era: draft.era })
              await load()
            }}
          >
            추가
          </Button>
        </section>
      ) : null}

      {tab === 'wrong' && (
        <section className="space-y-3">
          {wrong.length === 0 ? (
            <EmptyState title="아직 오답이 없습니다.">문제를 틀린 기록이 여기 모입니다.</EmptyState>
          ) : (
            wrong.map((item) => (
              <article key={item.id} className="surface p-4">
                <p className="meta-text">
                  {item.createdAt} · {ERA_LABELS[item.era]} · {WRONG_CAUSE_LABELS[item.cause]}
                </p>
                <h2 className="mt-1 font-semibold">{item.stem}</h2>
                <p className="mt-1 text-sm">
                  선택한 답 {item.selectedIndex + 1}번 · 정답 {item.correctIndex + 1}번
                </p>
                <p className="mt-2 text-[var(--ink-muted)]">{item.explanation}</p>
                <Button variant="secondary" className="mt-3" onClick={() => void addFromWrong(item)}>
                  카드로 추가
                </Button>
              </article>
            ))
          )}
        </section>
      )}

      <Dialog
        open={Boolean(editing)}
        title="카드 수정"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium">앞면</span>
              <textarea
                className="field-control mt-1"
                rows={5}
                value={editing.front}
                onChange={(event) => setEditing({ ...editing, front: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">뒷면</span>
              <textarea
                className="field-control mt-1"
                rows={4}
                value={editing.back}
                onChange={(event) => setEditing({ ...editing, back: event.target.value })}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => void saveEdit()}>
                저장
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                취소
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
