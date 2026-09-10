import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, InlineStatus, PageHeader } from '../components/ui'
import { getBrowserBillingHarness } from '../billing/client/harness'
import { isTestStore } from '../billing/client/controller'
import type { PurchaseFlowResult } from '../billing/client/controller'
import type { CatalogResponse, EntitlementSnapshot, TransactionStatus } from '../billing/types'
import type { NextPurchaseBehavior } from '../billing/store/testAdapter'

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending_purchase: '결제 보류',
  active: '이용 중',
  canceled_will_expire: '해지 예약 · 기간 남음',
  in_grace: '결제 유예',
  on_hold: '결제 보류(홀드)',
  paused: '일시 중지',
  expired: '만료',
  refunded: '환불됨',
  revoked: '철회됨',
}

const CAPABILITY_LABEL: Record<string, string> = {
  study_daily: '매일 학습',
  review_cards: '복습 카드',
  library: '자료실',
  progress: '학습 기록',
  mock_sample: '축소 모의',
  full_mock: '실전 모의(정규)',
  extended_study: '확장 학습 한도',
}

type Tone = 'neutral' | 'success' | 'error'

export function BillingPage() {
  const harness = getBrowserBillingHarness()
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(harness.client.currentSnapshot())
  const [status, setStatus] = useState<{ tone: Tone; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [behavior, setBehavior] = useState<NextPurchaseBehavior>('success')
  const [accountId, setAccountId] = useState(harness.client.accountId())

  const sync = () => {
    setSnapshot(harness.client.currentSnapshot())
    setAccountId(harness.client.accountId())
    harness.persist()
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        await harness.client.recoverUnfinished()
        const nextCatalog = await harness.client.loadCatalog()
        if (!alive) return
        setCatalog(nextCatalog)
        setSnapshot(harness.client.currentSnapshot())
        setAccountId(harness.client.accountId())
        harness.persist()
      } catch (error) {
        if (!alive) return
        setStatus({
          tone: 'error',
          text: error instanceof Error ? error.message : '이용권 정보를 불러오지 못했습니다.',
        })
      }
    })()
    return () => {
      alive = false
    }
  }, [harness])

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy || harness.client.inFlight()) return
    setBusy(true)
    try {
      await fn()
      sync()
    } catch (error) {
      setStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : `${label}에 실패했습니다.`,
      })
    } finally {
      setBusy(false)
    }
  }

  const describePurchase = (result: PurchaseFlowResult) => {
    if (result.status === 'purchased') {
      setStatus({ tone: 'success', text: '테스트 거래가 서버 검증을 통과했습니다. 실제 결제가 아닙니다.' })
      setSnapshot(result.snapshot)
      return
    }
    if (result.status === 'cancelled') {
      setStatus({ tone: 'neutral', text: '사용자가 결제를 취소했습니다. 권한은 바뀌지 않았습니다.' })
      return
    }
    if (result.status === 'pending') {
      setStatus({
        tone: 'neutral',
        text: '결제가 보류 상태입니다. 승인 전에는 유료 권한이 없습니다. (Ask to Buy / Play pending 가정)',
      })
      return
    }
    setStatus({ tone: 'error', text: result.message })
  }

  const products = catalog?.products ?? []
  const paidOpen = harness.client.hasPaidAccess('full_mock')
  const lines = snapshot?.transactions ?? []

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="개발용 결제 흐름" title="이용권">
        <p>
          무료 범위와 가격은 정해지지 않았습니다. 아래 상품은 개발용 가정이며 판매 중이 아닙니다.
        </p>
      </PageHeader>

      <section
        className="surface p-5 border-[var(--wrong)]"
        data-testid="billing-test-banner"
        role="status"
      >
        <h2 className="section-title">테스트 결제 모드</h2>
        <p className="meta-text mt-2 leading-relaxed">
          이 화면의 버튼은 스토어 테스트 어댑터만 사용합니다. 카드가 청구되지 않고, 운영 서버는 이
          거래를 승인할 수 없습니다. 실제 인앱결제가 완료된 것처럼 표시하지 않습니다.
        </p>
      </section>

      <section className="surface p-5" data-testid="billing-account">
        <h2 className="section-title">현재 계정과 구매 귀속</h2>
        <p className="meta-text mt-2 leading-relaxed">
          계정 시스템(B)이 연결되기 전에는 이 브라우저의 자리표시 식별자에 구매가 붙습니다. 같은
          서비스 계정으로 iOS·Android 권한을 합치는 것은 B 연동 이후입니다.
        </p>
        <p className="mt-3 break-all font-mono text-sm" data-testid="billing-account-id">
          {accountId}
        </p>
        <p className="meta-text mt-2">
          실전 모의(정규): {paidOpen ? '열림 (테스트 권한)' : '잠김 · 무료는 축소 모의만'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run('계정 전환', async () => {
                const next = `placeholder:test:${crypto.randomUUID()}`
                harness.client.setAccountId(next)
                setStatus({
                  tone: 'neutral',
                  text: '테스트 계정을 바꿨습니다. 이전 계정의 권한 캐시는 버렸습니다. 스토어 복원 시 충돌이 날 수 있습니다.',
                })
              })
            }
          >
            다른 테스트 계정으로 전환
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">상품</h2>
        {products.map((product) => (
          <article key={product.productId} className="surface p-5" data-testid={`product-${product.productId}`}>
            <h3 className="font-semibold">{product.title}</h3>
            <p className="meta-text mt-2 leading-relaxed">{product.description}</p>
            <p className="mt-3 text-sm">
              스토어 현지화 가격:{' '}
              <strong>{product.localizedPrice?.display ?? '스토어 가격 없음'}</strong>
              <span className="meta-text"> (테스트 어댑터 · 판매가 아님)</span>
            </p>
            <p className="meta-text mt-2 leading-relaxed">{product.terms}</p>
            <p className="meta-text mt-2">
              권한: {product.entitlements.map((item) => CAPABILITY_LABEL[item] ?? item).join(', ')}
            </p>
            <Button
              className="mt-4"
              disabled={busy || harness.client.inFlight()}
              onClick={() =>
                void run('구매', async () => {
                  if (isTestStore(harness.store)) harness.store.setNextPurchaseBehavior(behavior)
                  describePurchase(await harness.client.purchase(product.productId))
                })
              }
            >
              {busy ? '처리 중…' : '테스트 구매'}
            </Button>
          </article>
        ))}
      </section>

      <section className="surface p-5">
        <h2 className="section-title">복원 · 재확인 · 구독 관리</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run('복원', async () => {
                const restored = await harness.client.restore()
                if (restored.conflicts.length > 0) {
                  setStatus({
                    tone: 'error',
                    text: `다른 계정에 이미 연결된 구매가 ${restored.conflicts.length}건 있어 가져오지 않았습니다.`,
                  })
                } else {
                  setStatus({
                    tone: 'success',
                    text: '테스트 스토어에서 구매를 복원하고 서버가 다시 검증했습니다.',
                  })
                }
              })
            }
          >
            구매 복원
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run('재확인', async () => {
                try {
                  await harness.client.refresh()
                  setStatus({ tone: 'success', text: '서버가 스토어 원본을 다시 읽어 권한을 갱신했습니다.' })
                } catch (error) {
                  setStatus({
                    tone: 'error',
                    text:
                      error instanceof Error
                        ? `${error.message} 캐시가 만료되면 유료 권한을 유지하지 않습니다.`
                        : '재확인에 실패했습니다.',
                  })
                }
              })
            }
          >
            권한 다시 확인
          </Button>
          <Button
            variant="text"
            disabled={busy}
            onClick={() =>
              void run('구독 관리', async () => {
                await harness.store.showManageSubscriptions()
                setStatus({
                  tone: 'neutral',
                  text: '실제 기기에서는 스토어 구독 관리 화면으로 이동합니다. 웹 미리보기는 테스트 모드라 스토어를 열지 않습니다. https://apps.apple.com/account/subscriptions 또는 Play 구독 관리를 안내하세요.',
                })
              })
            }
          >
            구독 관리 경로
          </Button>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="section-title">현재 권한</h2>
        {lines.length === 0 ? (
          <p className="meta-text mt-2">서버가 확인한 유료 거래가 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lines.map((line) => (
              <li key={line.originalStoreTransactionId} className="meta-text">
                {line.productId} · {STATUS_LABEL[line.status]}
                {line.expiresAt ? ` · 만료 ${line.expiresAt}` : ''}
                {line.autoRenewEnabled === false ? ' · 자동 갱신 꺼짐' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-5" data-testid="billing-dev-tools">
        <h2 className="section-title">개발용 시나리오</h2>
        <p className="meta-text mt-2 leading-relaxed">
          사용자에게 보이는 스토어 UI가 아닙니다. 결제 상태 기계를 이 미리보기에서 검증하기 위한
          조작입니다.
        </p>
        <fieldset className="mt-4 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">다음 테스트 구매 결과</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['success', '성공'],
                ['cancelled', '사용자 취소'],
                ['pending', '보류'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={behavior === value ? 'primary' : 'secondary'}
                onClick={() => setBehavior(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run('보류 승인', async () => {
                const pending = harness.world.listRecords().find((row) => row.status === 'pending_purchase')
                if (!pending) {
                  setStatus({ tone: 'neutral', text: '보류 중인 테스트 거래가 없습니다.' })
                  return
                }
                const notification = await harness.world.approvePending(pending.originalStoreTransactionId)
                await harness.service.handleNotification(notification)
                await harness.client.recoverUnfinished()
                setStatus({ tone: 'success', text: '보류 결제를 승인하고 서버가 권한을 부여했습니다.' })
              })
            }
          >
            보류 승인
          </Button>
          <DevAction
            busy={busy}
            label="갱신"
            onRun={() =>
              run('갱신', async () => {
                await mutateLatest(harness, (id) => harness.world.renew(id))
                setStatus({ tone: 'success', text: '구독을 갱신했습니다. 해지가 아니므로 권한이 유지됩니다.' })
              })
            }
          />
          <DevAction
            busy={busy}
            label="해지 예약"
            onRun={() =>
              run('해지 예약', async () => {
                await mutateLatest(harness, (id) => harness.world.scheduleCancel(id))
                await harness.client.refresh()
                setStatus({
                  tone: 'success',
                  text: '해지를 예약했습니다. 남은 기간 동안은 권한이 유지됩니다.',
                })
              })
            }
          />
          <DevAction
            busy={busy}
            label="만료"
            onRun={() =>
              run('만료', async () => {
                await mutateLatest(harness, (id) => harness.world.expire(id))
                await harness.client.refresh()
                setStatus({ tone: 'neutral', text: '기간이 만료되어 유료 권한을 회수했습니다.' })
              })
            }
          />
          <DevAction
            busy={busy}
            label="환불"
            onRun={() =>
              run('환불', async () => {
                await mutateLatest(harness, (id) => harness.world.refund(id))
                await harness.client.refresh()
                setStatus({ tone: 'neutral', text: '환불 후 유료 권한을 즉시 회수했습니다.' })
              })
            }
          />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              harness.world.setUnavailable(true)
              harness.persist()
              setStatus({
                tone: 'neutral',
                text: '스토어 검증을 막아 두었습니다. 재확인은 실패하고 성공으로 우회하지 않습니다.',
              })
            }}
          >
            서버 장애 켜기
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              harness.world.setUnavailable(false)
              harness.persist()
              setStatus({ tone: 'neutral', text: '스토어 검증을 다시 켰습니다.' })
            }}
          >
            서버 장애 끄기
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run('계정 삭제', async () => {
                const result = harness.service.accountDeleted(
                  harness.client.accountId(),
                  new Date().toISOString(),
                )
                harness.persistence.setSnapshot(null)
                setStatus({
                  tone: 'neutral',
                  text: `서비스 권한을 지웠습니다. 스토어 구독은 남아 있을 수 있습니다. Apple ${result.manageUrls.apple}`,
                })
              })
            }
          >
            계정 삭제 시뮬레이트
          </Button>
        </div>
      </section>

      <p className="meta-text leading-relaxed">
        만 14세 이상 대상이어도 결제 사용자를 성인으로 보지 않습니다. 미성년자 계약은 법정대리인 동의가
        없으면 취소할 수 있다는 고지가 필요하며, 문구는 법무 검토 전입니다.
      </p>

      {status ? (
        <div data-testid="billing-status">
          <InlineStatus tone={status.tone}>{status.text}</InlineStatus>
        </div>
      ) : null}

      <p>
        <Link to="/settings" className="btn btn-text">
          설정으로
        </Link>
      </p>
    </div>
  )
}

function DevAction({
  busy,
  label,
  onRun,
}: {
  busy: boolean
  label: string
  onRun: () => void
}) {
  return (
    <Button variant="secondary" disabled={busy} onClick={onRun}>
      {label}
    </Button>
  )
}

async function mutateLatest(
  harness: ReturnType<typeof getBrowserBillingHarness>,
  mutate: (id: string) => Promise<unknown>,
) {
  const latest = harness.world.listRecords().at(-1)
  if (!latest) throw new Error('먼저 테스트 구매를 진행하세요.')
  const notification = await mutate(latest.originalStoreTransactionId)
  if (notification && typeof notification === 'object' && 'notificationId' in notification) {
    await harness.service.handleNotification(
      notification as Parameters<typeof harness.service.handleNotification>[0],
    )
  }
  await harness.client.refresh()
}
