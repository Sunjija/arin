import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, EmptyState, InlineStatus, PageHeader } from '../components/ui'
import { db } from '../db/database'
import { isDue, toDateKey } from '../lib/dates'
import { addCardFromContent, startOrResumeSession } from '../lib/studyService'
import { createWrongCardFromQuestion, updateCardContent } from '../lib/wrongCard'
import {
  ALL_ERAS,
  ERA_LABELS,
  WRONG_CAUSE_LABELS,
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

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="복습" title="암기카드">
        <p className="mt-2 text-[var(--ink-muted)]">오늘 복습 목록을 보거나, 카드를 골라 학습을 시작하세요.</p>
      </PageHeader>

      <section className="surface p-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="복습 목록">
          {(
            [
              ['due', '오늘 복습'],
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
        <section className="surface space-y-3 p-4">
          <div>
            <h2 className="section-title">오늘 복습 목록</h2>
            <p className="meta-text mt-1">
              {dueCards.length}장입니다. 이 화면은 목록이며, 학습은 아래 버튼으로 시작합니다.
            </p>
          </div>
          {dueCards.length > 0 ? (
            <Button className="w-full" disabled={starting} onClick={() => void startReview()}>
              {starting ? '시작하는 중…' : `오늘 복습 시작 · ${dueCards.length}장`}
            </Button>
          ) : (
            <EmptyState title="오늘 복습할 카드 없음">나중에 복습할 카드가 쌓이면 여기에 목록이 생깁니다.</EmptyState>
          )}
        </section>
      ) : null}

      {tab !== 'wrong' && (
        <>
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

          <section className="space-y-3" aria-label={tab === 'due' ? '오늘 복습 카드 목록' : '전체 카드 목록'}>
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
        </>
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
