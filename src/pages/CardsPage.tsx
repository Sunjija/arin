import { useEffect, useMemo, useState } from 'react'
import { db } from '../db/database'
import { addCardFromContent } from '../lib/studyService'
import { isDue, toDateKey } from '../lib/dates'
import {
  ALL_ERAS,
  ERA_LABELS,
  WRONG_CAUSE_LABELS,
  type EraId,
  type FlashcardRecord,
  type WrongAnswerRecord,
} from '../types'

type Tab = 'due' | 'all' | 'king' | 'chrono' | 'from-wrong' | 'wrong'

export function CardsPage() {
  const [tab, setTab] = useState<Tab>('due')
  const [cards, setCards] = useState<FlashcardRecord[]>([])
  const [wrong, setWrong] = useState<WrongAnswerRecord[]>([])
  const [query, setQuery] = useState('')
  const [era, setEra] = useState<EraId | 'all'>('all')
  const [hardOnly, setHardOnly] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState({ front: '', back: '', era: 'goryeo' as EraId })

  const load = async () => {
    const [c, w] = await Promise.all([db.cards.toArray(), db.wrongAnswers.orderBy('createdAt').reverse().toArray()])
    setCards(c)
    setWrong(w)
  }

  useEffect(() => {
    void load()
  }, [])

  const today = toDateKey()
  const filtered = useMemo(() => {
    let list = [...cards]
    if (tab === 'due') list = list.filter((c) => isDue(c.nextReviewAt, today))
    if (tab === 'king') list = list.filter((c) => c.kind === 'king-to-deed' || c.kind === 'deed-to-king')
    if (tab === 'chrono') list = list.filter((c) => c.kind === 'chronology')
    if (tab === 'from-wrong') list = list.filter((c) => c.fromWrongAnswer)
    if (era !== 'all') list = list.filter((c) => c.era === era)
    if (hardOnly) list = list.filter((c) => c.lastRating === 'again' || c.lastRating === 'hard' || c.lapses > 0)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q))
    }
    return list.sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
  }, [cards, tab, era, hardOnly, query, today])

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <h1 className="font-display text-2xl">오답 · 암기카드</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">복습일과 취약 유형을 한곳에서 관리합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['due', '오늘 복습'],
              ['all', '전체 카드'],
              ['king', '왕·업적'],
              ['chrono', '사건 순서'],
              ['from-wrong', '오답 카드'],
              ['wrong', '오답 목록'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab !== 'wrong' && (
        <>
          <section className="surface space-y-3 p-4">
            <label className="block">
              <span className="sr-only">검색</span>
              <input
                className="w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
                placeholder="카드 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-xl border border-[var(--line)] bg-white/70 p-3"
                value={era}
                onChange={(e) => setEra(e.target.value as EraId | 'all')}
                aria-label="시대 필터"
              >
                <option value="all">모든 시대</option>
                {ALL_ERAS.map((id) => (
                  <option key={id} value={id}>
                    {ERA_LABELS[id]}
                  </option>
                ))}
              </select>
              <label className="btn btn-secondary">
                <input type="checkbox" checked={hardOnly} onChange={(e) => setHardOnly(e.target.checked)} />
                어려운 카드만
              </label>
            </div>
          </section>

          <section className="space-y-3">
            {filtered.length === 0 ? (
              <div className="surface p-5 text-[var(--ink-muted)]">해당하는 카드가 없습니다.</div>
            ) : (
              filtered.map((card) => (
                <article key={card.id} className="surface p-4">
                  <p className="text-sm text-[var(--ink-muted)]">
                    {ERA_LABELS[card.era]} · 다음 복습 {card.nextReviewAt}
                    {card.fromWrongAnswer ? ' · 오답에서 생성' : ''}
                  </p>
                  <h2 className="mt-1 font-semibold">{card.front}</h2>
                  <p className="mt-1 text-[var(--ink-muted)]">{card.back}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        const front = window.prompt('앞면', card.front)
                        const back = window.prompt('뒷면', card.back)
                        if (!front || !back) return
                        await db.cards.put({ ...card, front, back, updatedAt: toDateKey() })
                        await load()
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="btn btn-wrong"
                      onClick={async () => {
                        if (!window.confirm('이 카드를 삭제할까요?')) return
                        await db.cards.delete(card.id)
                        await load()
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="surface space-y-3 p-5">
            <h2 className="font-display text-xl">카드 직접 추가</h2>
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
              placeholder="앞면"
              value={draft.front}
              onChange={(e) => setDraft({ ...draft, front: e.target.value })}
            />
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
              placeholder="뒷면"
              value={draft.back}
              onChange={(e) => setDraft({ ...draft, back: e.target.value })}
            />
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-white/70 p-3"
              value={draft.era}
              onChange={(e) => setDraft({ ...draft, era: e.target.value as EraId })}
              aria-label="시대"
            >
              {ALL_ERAS.map((id) => (
                <option key={id} value={id}>
                  {ERA_LABELS[id]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!draft.front.trim() || !draft.back.trim()) return
                const { created } = await addCardFromContent({
                  front: draft.front,
                  back: draft.back,
                  kind: 'concept',
                  era: draft.era,
                  tags: ['king-figure'],
                })
                setMessage(created ? '카드를 추가했습니다.' : '중복 카드라 추가하지 않았습니다.')
                setDraft({ front: '', back: '', era: draft.era })
                await load()
              }}
            >
              추가
            </button>
            {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
          </section>
        </>
      )}

      {tab === 'wrong' && (
        <section className="space-y-3">
          {wrong.length === 0 ? (
            <div className="surface p-5 text-[var(--ink-muted)]">아직 오답이 없습니다.</div>
          ) : (
            wrong.map((item) => (
              <article key={item.id} className="surface p-4">
                <p className="text-sm text-[var(--ink-muted)]">
                  {item.createdAt} · {ERA_LABELS[item.era]} · {WRONG_CAUSE_LABELS[item.cause]}
                </p>
                <h2 className="mt-1 font-semibold">{item.stem}</h2>
                <p className="mt-1 text-sm">선택한 답 {item.selectedIndex + 1}번 · 정답 {item.correctIndex + 1}번</p>
                <p className="mt-2 text-[var(--ink-muted)]">{item.explanation}</p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3"
                  onClick={async () => {
                    const { created } = await addCardFromContent({
                      front: item.stem,
                      back: item.explanation,
                      kind: 'concept',
                      era: item.era,
                      tags: item.tags,
                      fromWrongAnswer: true,
                    })
                    setMessage(created ? '카드로 추가했습니다.' : '이미 같은 카드가 있습니다.')
                    await load()
                  }}
                >
                  카드로 추가
                </button>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  )
}
