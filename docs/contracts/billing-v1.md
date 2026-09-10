# arin billing contract v1

상태: **초안 (구현 기준 계약)**  
작성: billing 담당 (`work/billing`)  
판매 활성화: **하지 않음**. 이 계약의 상품·가격은 개발용 가정이며 실제 판매 조건이 아니다.

이 문서는 상품 카탈로그, 이용 권한, 서버 검증, 앱 결제 화면, 스토어 어댑터의 요청·응답을 고정한다.  
계정 인증(B)과 네이티브 패키징(C)은 이 계약을 소비한다. 인증 시스템이나 앱 패키징을 여기서 다시 만들지 않는다.

관련 문서:

- 개발용 상품 가정: [`docs/billing/product-assumptions.md`](../billing/product-assumptions.md)
- 스토어 설정 체크리스트: [`docs/billing/store-setup.md`](../billing/store-setup.md)
- B·C 통합 순서: [`docs/billing/integration-bc.md`](../billing/integration-bc.md)
- 미성년자 구매 검토: [`docs/billing/minor-purchase-review.md`](../billing/minor-purchase-review.md)
- 실행·운영: [`docs/billing/README.md`](../billing/README.md)

B의 `docs/contracts/account-sync-v1.md`, C의 `docs/contracts/mobile-platform-v1.md`가 생기면 식별자·네이티브 브리지 절을 그 계약의 필드명에 맞춰 갱신한다. 현재(2026-09-10) 두 계약은 저장소에 없다.

---

## 1. 범위와 비범위

담당:

- 상품 카탈로그와 무료·유료 이용 권한
- 결제·복원 화면
- Apple/Google 인앱결제 연결 어댑터 (일반 IAP만)
- 서버 거래 검증, 알림 처리, 재검증
- 구매 복원·갱신·해지 예약·만료·환불·보류
- 관련 테스트와 운영 문서

하지 않음:

- 문항 생성·검수·출제 비율
- 모의고사 조립·채점·시험 기록 보존
- 계정 인증·세션 발급 (B)
- 앱 패키징·스토어 서명 설정 파일 (C)
- 웹 결제, 외부 결제, 제3자 PG, Reader 앱 예외 경로

문항 `reviewStatus`(draft / fact_checked / approved / retired)와 유료 권한은 별개다.  
**결제가 되어도 미승인 문항에 접근하지 않는다.** 콘텐츠 파이프라인이 `approved`만 노출하고, billing은 문항 공개 상태를 바꾸지 않는다.

결제 경로: App Store In-App Purchase(StoreKit 2 + App Store Server API/Notifications V2)와 Google Play Billing(Play Billing Library 7+ , Play Developer API `subscriptionsv2` / `products`, RTDN).  
다른 결제 프로그램 조건은 검토하지 않았고 추가하지 않는다.

---

## 2. 식별자

| 이름 | 형식 | 출처 | 의미 |
|---|---|---|---|
| `accountId` | 불투명 문자열 | B | 서비스 사용자. 구매 귀속의 유일한 대상 |
| `installId` | UUID | 앱 로컬 | 기기 설치 식별. 계정이 아니다 |
| `appAccountToken` | UUID | billing → Apple | StoreKit `appAccountToken`. `accountId`와 1:1 매핑 테이블로 유지 |
| `obfuscatedAccountId` | 최대 64자 | billing → Google | Play Billing `setObfuscatedAccountId`. `accountId` 해시 또는 B가 준 안정 ID |
| `productId` | 카탈로그 ID | billing | 내부 상품 ID. 스토어 SKU와 별도 |
| `storeProductId` | 스토어 SKU | App Store Connect / Play Console | 플랫폼별 상품 ID |
| `originalStoreTransactionId` | 스토어 원 거래 ID | Apple `originalTransactionId` / Google 구독 계열의 최초 `purchaseToken` 계보 | 계정 귀속 키 |
| `storeTransactionId` | 현재 거래 ID | Apple `transactionId` / Google `orderId`(완료 후) | 갱신마다 달라질 수 있음 |
| `purchaseToken` | 비밀 | Google `purchaseToken` / Apple JWS | 로그·응답에 원문 금지 |
| `notificationId` | UUID | Apple `notificationUUID` / Google 메시지 ID | 알림 멱등 키 |
| `environment` | `test` \| `sandbox` \| `production` | 서버·스토어 검증 결과 | 클라이언트가 주장하는 값이 아님 |

B가 오기 전 클라이언트는 `placeholder:install:<installId>`를 **개발용 자리표시 계정**으로만 쓴다. 이 값은 서비스 계정이 아니며, 다른 기기 복원의 최종 키가 될 수 없다.

---

## 3. 상품과 이용 권한 모델

### 3.1 Capability

권한은 상품 SKU가 아니라 capability 집합이다.

| capability | 기본(무료) | 유료 상품이 부여 | 설명 |
|---|---|---|---|
| `study_daily` | 예 | — | 일일 학습 세션 |
| `review_cards` | 예 | — | 복습 카드 |
| `library` | 예 | — | 자료실·연표 |
| `progress` | 예 | — | 학습 기록 |
| `mock_sample` | 예 | — | 축소 모의(샘플) |
| `full_mock` | 아니오 | 프리미엄 구독, 30일 실전 이용권 | 정규 50문항 실전 모의. 조립·채점은 D/콘텐츠 담당 |
| `extended_study` | 아니오 | 프리미엄 구독만 | 개발용 가정: 일일 학습 상한 확대. 수치는 설정 |

무료 범위·가격·구독 종류는 사용자 결정 전이다. 위 표는 **개발용 가정**이며 설정(`src/billing/catalog.ts`)으로 바꾼다.

### 3.2 개발용 카탈로그 (판매 아님)

`salesEnabled`는 항상 `false`로 시작한다. `true`로 올리는 것은 이 담당의 완료 조건이 아니다.

| `productId` | 유형 | 기간 | 부여 capability | Apple 유형 | Google 유형 | 개발용 표시가(KRW) |
|---|---|---|---|---|---|---|
| `arin_premium_monthly` | 자동 갱신 구독 | 스토어 기간(가정 1개월) | `full_mock`, `extended_study` | Auto-Renewable Subscription, 그룹 `arin_premium` | Subscription base plan (auto-renewing) | 4900 (가정) |
| `arin_mock_pass_30d` | 기간 이용권 | 30일, 자동 갱신 없음 | `full_mock` | Non-Renewing Subscription | one-time in-app (managed product, 비소비) 또는 prepaid 30일. **최종 SKU 유형은 사용자 결정** | 9900 (가정) |

적용 가정 (검증용, 확정 아님):

- **자동 갱신 구독**을 주 상품으로 둔다. 학습 콘텐츠가 계속 추가되는 SaaS에 해당한다고 보고 Apple 3.1.2(a) “ongoing value”를 만족하는 방향으로 설계한다. 법무·스토어 리뷰 통과를 완료 처리하지 않는다.
- **기간 이용권**으로 실전 모의만 여는 경로를 두어 비갱신 만료 흐름을 검증한다.
- **영구 구매(non-consumable lifetime)** 는 카탈로그에 넣지 않는다. 문항 품질·가격 정책이 정해진 뒤 추가한다.

사용자 결정이 필요한 사항은 5절과 `product-assumptions.md`에 남긴다. 표시가는 스토어 현지화 가격이 오면 그 값을 쓰고, 개발 가정 가격을 판매가로 보여 주지 않는다.

### 3.3 구독 그룹

`arin_premium` 그룹에는 현재 월간만 넣는다. 연간·다단계 구독은 결정 전이다. 같은 그룹에서 동시에 두 등급이 활성이지 않도록 스토어 설정을 따른다.

### 3.4 플랫폼 간 동일 계정

권한의 소스 오브 트루스는 **arin 서버의 `accountId` 귀속**이다.

- iOS에서 검증된 거래와 Android에서 검증된 거래는 같은 `accountId`에 합쳐진다.
- 스토어 계정(Apple ID / Google 계정)이 같더라도 arin 계정이 다르면 귀속하지 않는다 (6.5).
- 스토어 계정이 달라도 arin 계정이 같으면, 각 플랫폼에서 따로 구매한 유효 권한이 합쳐진다 (교차 지급이 아님. 각자 검증된 거래만).
- Family Sharing / Play Family Library로 다른 사람에게 권한을 줄지는 **미결정**. 초기 구현은 구매자 `accountId`에만 부여한다.

---

## 4. 상태 모델

### 4.1 거래 상태 `TransactionStatus`

서버가 스토어 검증 스냅샷을 정규화한 값이다. 클라이언트의 “결제 성공” 콜백이 아니다.

| 상태 | 권한 | 의미 |
|---|---|---|
| `pending_purchase` | 없음 | Ask to Buy, Play pending, 지연 결제. 완료 전 |
| `active` | 있음 | 만료 시각 전까지 유효 |
| `canceled_will_expire` | 만료 전까지 있음 | 자동 갱신 끔. **즉시 소멸이 아님** |
| `in_grace` | 있음 | 결제 재시도 유예. Apple `gracePeriodExpiresDate` / Google `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` |
| `on_hold` | 없음 | 유예 종료 후 계정 보류. Google `ON_HOLD`, Apple billing retry 만료 이후 |
| `paused` | 없음 | Google 일시중지 |
| `expired` | 없음 | 기간 종료 |
| `refunded` | 없음 | 환불·철회. 즉시 회수 |
| `revoked` | 없음 | 스토어 취소·환불+revoke |

소비성(consumable) 상품은 이 버전 카탈로그에 없다.

### 4.2 권한 스냅샷 `EntitlementSnapshot`

```ts
interface EntitlementSnapshot {
  accountId: string
  environment: 'test' | 'sandbox' | 'production'
  capabilities: Capability[]
  transactions: EntitlementLine[]
  verifiedAt: string          // ISO-8601, 서버 시계
  offlineValidUntil: string   // verifiedAt + 오프라인 TTL
  stale: boolean              // 재검증 필요
}

interface EntitlementLine {
  productId: string
  status: TransactionStatus
  autoRenewEnabled: boolean | null
  expiresAt: string | null
  originalStoreTransactionId: string
  store: 'apple' | 'google' | 'test'
}
```

부여 규칙:

- `active` | `canceled_will_expire` | `in_grace` 이고 (`expiresAt` 없음 또는 `expiresAt > now`) → capability 부여
- `pending_purchase` | `on_hold` | `paused` | `expired` | `refunded` | `revoked` → 부여하지 않음
- 같은 capability를 여러 거래가 주면 OR. 가장 늦은 `expiresAt`을 표시용으로 남긴다.

오프라인 TTL 기본값: 48시간 (`offlineTtlMs`). 지나면 `stale: true`이고 유료 capability는 서버 재확인 전까지 앱이 **없다고 본다**. 만료를 오프라인에서 연장하지 않는다.

### 4.3 알림과 재검증

알림은 힌트다. 권한은 **스토어 원본을 다시 읽어 만든 스냅샷**으로 결정한다.

1. 알림 `notificationId`로 멱등 저장한다. 중복은 `duplicate_notification`으로 기록하고 현재 스냅샷을 반환한다.
2. 알림만으로 권한을 올리지 않는다. 해당 거래의 스토어 검증(Apple Get Transaction History / Google `subscriptionsv2.get` 또는 테스트 스토어 원본)을 수행한다.
3. 늦게 오거나 역순으로 와도 최종 상태는 스토어 스냅샷과 같다. 알림의 `eventTime`이 이미 적용한 스냅샷보다 오래되고, 그 알림이 환불·철회가 아니면 `stale_notification`으로 기록만 한다.
4. 환불·철회(`REFUND`, `REVOKE`, `VOIDED_PURCHASE`, `SUBSCRIPTION_REVOKED`)는 스냅샷이 그 사실을 확인하는 즉시 권한을 회수한다.
5. 알림이 누락되면 앱의 복원·재확인과 서버의 `POST /v1/billing/refresh`가 보완한다.

---

## 5. 사용자 결정이 필요한 사항 (완료하지 않음)

아래는 구현이 가정만 두고 막지 않은 결정이다. 임의로 확정 처리하지 않는다.

1. 무료로 둘 학습 범위와 유료로 잠글 범위 (실전 모의만인지, 일일 상한인지, 해설 깊이인지)
2. 구독 vs 기간 이용권 vs 영구 구매의 실제 판매 조합
3. 가격, 국가별 가격, 무료 체험, 인트로 오퍼, 윈백 오퍼
4. 연간 구독 여부, 구독 그룹 내 등급
5. Family Sharing / Play 가족 라이브러리 공유 여부
6. 계정 삭제 시 Play 구독을 서버가 취소할지 (기본 구현: **취소하지 않음**, 스토어 구독 관리로 안내)
7. 환불 후 재구매 제한, abuse 정책
8. 오프라인 TTL 길이
9. 14–18세 가입·결제 UI 카피, 법정대리인 고지 위치 (법무 검토)
10. 실제 판매 개시 시점 — 문항 품질 로드맵 P3 이후

---

## 6. 구매 수명주기 정책

### 6.1 클라이언트 결제 성공만으로 권한 부여 금지

앱이 StoreKit `verified` / Play `PURCHASED`를 받아도 서버 `POST /v1/billing/verify`가 스토어 서명·API로 재확인하기 전에는 capability를 넣지 않는다.  
스토어 검증이 불가능하면(`store_verification_unavailable`) **실패로 끝낸다. 성공 우회 없음.**

### 6.2 해지 예약 ≠ 즉시 소멸

사용자가 구독 해지를 예약하면 `autoRenewEnabled=false`가 되고 상태는 `canceled_will_expire`다. `expiresAt`까지 `full_mock` 등을 유지한다.

### 6.3 갱신

새 `storeTransactionId` / 새 만료 시각이 검증되면 같은 `originalStoreTransactionId` 계열을 갱신한다. 중복 알림은 한 번만 적용한다.

### 6.4 보류

`pending_purchase`는 권한 없음. 승인되면 같은 미완료 거래를 `verify` 또는 알림 재검증으로 `active`가 된다. 거절·만료되면 기록만 남기고 권한 없음.

### 6.5 계정 귀속과 충돌

귀속 키: `store + environment + originalStoreTransactionId`.

- 미귀속 거래를 검증할 때 요청의 `accountId`에 처음으로 묶는다.
- 다른 **활성** `accountId`가 이미 묶여 있으면 `purchase_bound_to_other_account`. 권한을 옮기지 않는다.
- 삭제된 계정에만 묶여 있으면 새 활성 계정으로 재귀속할 수 있다 (제안 정책, 법무 미완료).
- 한 거래가 두 활성 계정에 동시에 유효하지 않는다.

### 6.6 복원

복원은 스토어 계정 거래 목록을 가져와 각각 `verify`하는 것이다. 새 기기·재설치에서도 서버 스냅샷이 권한이다.  
자리표시 계정만 있는 웹 미리보기에서는 **그 브라우저의 테스트 스토어 원본**만 복원된다. 실제 Apple/Google 복원은 C의 네이티브 SDK 연결 후에만 가능하다.

### 6.7 계정 변경

앱은 현재 `accountId`(또는 자리표시)를 결제 화면에 보여 준다. 로그아웃·계정 전환 후 이전 계정의 로컬 캐시는 버린다. 스토어 복원이 다른 계정에 묶인 거래를 가져오면 충돌 오류를 보여 주고 권한을 넣지 않는다.

### 6.8 계정 삭제와 구독 관리

B가 계정 삭제를 확정하면 `POST /v1/billing/account-deleted`를 호출한다.

서버:

- 해당 `accountId`의 권한 스냅샷을 비활성으로 표시한다.
- Apple/Google 구독을 **자동 해지하지 않는다** (기본). Apple은 개발자가 이용자 Apple ID 구독을 대신 끄지 못한다. Google `subscriptionsv2.cancel`은 가능하나 사용자 결정 전이라 호출하지 않는다.
- 응답에 스토어 구독 관리 URL과 “스토어에서 해지하지 않으면 청구가 계속될 수 있다”는 안내를 넣는다.

이용자는 앱의 “구독 관리”로 스토어 UI에 가야 한다.

### 6.9 개발 거래와 운영 거래

| 서버 `environment` | 허용하는 검증 결과 |
|---|---|
| `test` | `test` 어댑터 거래만 |
| `sandbox` | Apple sandbox / Google license tester만 |
| `production` | 운영 스토어만. `test.*` 토큰·테스트 알림은 `test_transaction_rejected` |

운영 서버는 테스트 어댑터 성공을 승인할 수 없다.

### 6.10 비밀

카드 번호를 받지 않고 저장하지 않는다. 결제 수단은 스토어가 처리한다.  
로그·클라이언트 오류 메시지에 `purchaseToken`, JWS, 영수증, 서명 키, 서비스 계정 JSON을 넣지 않는다. 필요하면 SHA-256 지문만 남긴다.

---

## 7. HTTP API (서버 ↔ 앱, 서버 ↔ 스토어)

Base path: `/v1/billing`  
인증: B가 발급한 액세스 토큰. `Authorization: Bearer <accessToken>`.  
테스트 환경만 `Authorization: Bearer test:<accountId>`를 허용하는 `TestAccountAuth`를 둔다. 운영에서는 이 스킴을 거부한다.

공통 오류 본문:

```ts
interface BillingErrorBody {
  error: BillingErrorCode
  message: string
  details?: Record<string, string>
}
```

`BillingErrorCode`:

`unauthorized` · `sales_not_enabled` · `product_unknown` · `store_verification_failed` · `store_verification_unavailable` · `test_transaction_rejected` · `environment_mismatch` · `purchase_bound_to_other_account` · `pending_purchase` · `entitlement_inactive` · `duplicate_notification` · `stale_notification` · `conflict` · `not_found` · `invalid_request`

### 7.1 `GET /v1/billing/catalog`

응답:

```ts
interface CatalogResponse {
  salesEnabled: boolean
  environment: 'test' | 'sandbox' | 'production'
  testMode: boolean
  products: Array<{
    productId: string
    storeProductId: string
    type: 'auto_renewable_subscription' | 'non_renewing_period'
    subscriptionGroup: string | null
    entitlements: Capability[]
    title: string
    description: string
    terms: string
    localizedPrice: { currency: string; amount: number; display: string } | null
    assumedDevPriceDisplay: string | null  // 테스트 어댑터에서만, “판매가 아님” 카피와 함께
  }>
}
```

`localizedPrice`는 스토어 SDK가 준 값이다. 없으면 `null`이지 가정 가격으로 채우지 않는다. 테스트 어댑터는 현지화 가격을 주되 `testMode: true`와 가정이 함께 있어야 한다.

### 7.2 `GET /v1/billing/entitlements`

현재 계정 스냅샷. 서버가 저장한 마지막 검증 결과. 필요하면 만료된 줄을 재계산한다. 스토어 왕복은 하지 않는다.

### 7.3 `POST /v1/billing/verify`

앱이 스토어에서 받은 서명 거래를 넘긴다.

```ts
interface VerifyRequest {
  store: 'apple' | 'google' | 'test'
  productId: string
  signedPayload: string    // Apple JWS, Google purchaseToken, test token
  appAccountToken?: string
}

interface VerifyResponse {
  snapshot: EntitlementSnapshot
  transactionStatus: TransactionStatus
  finished: boolean        // 서버가 귀속까지 끝냈으면 true → 앱이 finish/acknowledge
}
```

권한 부여 조건: verifier가 서명한 스냅샷 + 상품이 카탈로그에 있음 + 환경 일치 + 귀속 성공.  
`pending`이면 `finished: false`, 권한 없음.

### 7.4 `POST /v1/billing/restore`

본문 없음(또는 스토어가 준 거래 배열을 서버가 다시 검증).  
앱은 네이티브 `restoreTransactions()` 후 각 미완료·현재 거래를 `verify`한다. 이 엔드포인트는 서버가 아는 거래를 스토어에서 다시 읽어 스냅샷을 재구성한다.

```ts
interface RestoreResponse {
  snapshot: EntitlementSnapshot
  conflicts: Array<{ originalStoreTransactionId: string; boundAccountIdFingerprint: string }>
}
```

### 7.5 `POST /v1/billing/refresh`

알림 누락·서버 장애 후 재검증. 계정에 묶인 모든 `originalStoreTransactionId`를 스토어에서 다시 읽는다. 스토어가 불가면 오류이고 기존 스냅샷을 유료 성공으로 연장하지 않는다.

### 7.6 `POST /v1/billing/notifications/apple`

App Store Server Notifications V2. 본문 `{ signedPayload: string }`.  
테스트 서버는 서명 없는 canonical JSON을 `test` 환경에서만 받는다. 운영은 JWS 서명 검증 실패 시 5xx가 아니라 **4xx/검증 실패로 권한 변경 없음**. Apple 재시도를 위해 일시 오류만 5xx.

처리 후 항상 스토어 거래를 재조회한다.

### 7.7 `POST /v1/billing/notifications/google`

Play RTDN. Pub/Sub 푸시 JSON. `subscriptionNotification` | `oneTimeProductNotification` | `voidedPurchaseNotification` | `testNotification`.  
`testNotification`은 운영에서 권한을 바꾸지 않는다. 그 외는 Developer API로 재조회한다. 자격 증명이 없으면 `store_verification_unavailable`이고 권한을 올리지 않는다.

### 7.8 `POST /v1/billing/account-deleted`

B만 호출. 본문 `{ accountId, deletedAt }`.  
응답 `{ snapshotCleared: true, manageUrls, openStoreSubscriptions: EntitlementLine[] }`.

### 7.9 유료 API 가드

서버의 유료 학습 API(아직 B 서버에 없음)는 핸들러에서:

```ts
assertCapability(snapshot, 'full_mock') // 아니면 403 entitlement_inactive
```

이 가드는 문항 검수 상태를 대체하지 않는다. 콘텐츠 API는 `approved` 문항만 따로 필터한다.

---

## 8. C가 연결할 네이티브 SDK 인터페이스

C는 패키징·스토어 설정 파일을 소유한다. billing은 아래 TypeScript 계약을 제공한다. 구현체는 iOS StoreKit 2, Android Play Billing Library 7 이상을 기대한다.

```ts
interface NativeStoreBilling {
  readonly store: 'apple' | 'google'
  getProducts(storeProductIds: string[]): Promise<StoreProduct[]>
  purchase(input: {
    storeProductId: string
    accountId: string
    appAccountToken?: string       // Apple UUID
    obfuscatedAccountId?: string   // Google
  }): Promise<NativePurchaseResult>
  restore(): Promise<NativeStoreTransaction[]>
  unfinished(): Promise<NativeStoreTransaction[]>
  finish(storeTransactionId: string): Promise<void>          // Apple finish
  acknowledge(purchaseToken: string): Promise<void>          // Google, 서버 ack가 더 우선
  subscribeUpdates(cb: (tx: NativeStoreTransaction) => void): () => void
  showManageSubscriptions(storeProductId?: string): Promise<void>
}

type NativePurchaseResult =
  | { status: 'purchased'; transaction: NativeStoreTransaction }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'error'; code: string; message: string }

interface NativeStoreTransaction {
  storeProductId: string
  originalStoreTransactionId: string
  storeTransactionId: string
  signedPayload: string
  purchasedAt: string
  environment: 'sandbox' | 'production'
}

interface StoreProduct {
  storeProductId: string
  localizedTitle: string
  localizedDescription: string
  localizedPrice: { currency: string; amount: number; display: string }
}
```

앱 흐름:

1. 시작 시 `unfinished()` + `subscribeUpdates`로 미완료 거래를 `verify`한다. 앱이 종료된 뒤에도 이 경로로 복구한다.
2. `verify`가 `finished: true`일 때만 `finish` / 서버 acknowledge.
3. 구매 버튼은 in-flight 락. 중복 클릭으로 `purchase`를 두 번 열지 않는다.
4. 구독 관리는 `showManageSubscriptions`. 웹 미리보기에서는 스토어 URL 안내만 한다.

브라우저 미리보기는 `TestStoreBilling`을 쓴다. 화면 상단에 **테스트 결제 모드**를 고정 표시한다. 실제 결제·실제 영수증처럼 보이지 않게 한다.

---

## 9. 웹훅·스토어 이벤트 매핑 (요약)

Apple ASSN V2 → 내부 처리 (항상 재조회로 확정):

| notificationType (subtype) | 의도 |
|---|---|
| SUBSCRIBED (INITIAL_BUY, RESUBSCRIBE) | 재조회로 active 반영 |
| DID_RENEW | 만료 연장 |
| DID_CHANGE_RENEWAL_STATUS (AUTO_RENEW_DISABLED) | canceled_will_expire |
| DID_CHANGE_RENEWAL_STATUS (AUTO_RENEW_ENABLED) | active |
| DID_FAIL_TO_RENEW (GRACE_PERIOD) | in_grace |
| DID_FAIL_TO_RENEW (BILLING_RETRY) / GRACE_PERIOD_EXPIRED | on_hold 또는 expired (스토어 필드) |
| EXPIRED | expired |
| REFUND / REVOKE | refunded / revoked, 즉시 회수 |
| TEST | 운영 권한 변경 없음 |

Google RTDN:

| 값 | 의도 |
|---|---|
| SUBSCRIPTION_PURCHASED / RENEWED / RECOVERED / RESTARTED | 재조회 |
| SUBSCRIPTION_CANCELED | canceled_will_expire (만료 전) |
| SUBSCRIPTION_IN_GRACE_PERIOD | in_grace |
| SUBSCRIPTION_ON_HOLD | on_hold |
| SUBSCRIPTION_PAUSED | paused |
| SUBSCRIPTION_EXPIRED | expired |
| SUBSCRIPTION_REVOKED / voidedPurchaseNotification | 즉시 회수 |
| SUBSCRIPTION_PENDING_PURCHASE_CANCELED | pending 종료, 권한 없음 |
| testNotification | 운영 권한 변경 없음 |

근거 (공식, 구현일 기준):

- [App Store Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications)
- [StoreKit 2](https://developer.apple.com/storekit/)
- [App Review Guidelines 3.1.1, 3.1.2](https://developer.apple.com/app-store/review/guidelines/)
- [Play Billing 연동](https://developer.android.com/google/play/billing/integrate)
- [Play 구독 수명주기](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [RTDN 레퍼런스](https://developer.android.com/google/play/billing/rtdn-reference)

---

## 10. 미성년자

앱 대상이 14세 이상이어도 구매자를 성인으로 취급하지 않는다.

- 대한민국 민법상 미성년은 만 19세 미만이다. 법정대리인 동의 없는 법률행위는 취소할 수 있다 (민법 제5조).
- 전자상거래법 제13조 제3항: 미성년자와 계약할 때 법정대리인이 동의하지 않으면 본인 또는 법정대리인이 취소할 수 있음을 고지해야 한다.
- Apple Ask to Buy / `PurchaseResult.pending` ([Ask to Buy](https://support.apple.com/105055)).
- Google Play 구매 승인 / Family Link pending ([Play 구매 승인](https://support.google.com/googleplay/answer/7039872)).

고지 카피·나이 확인·취소 절차는 법무와 사용자 결정이다. billing은 pending 상태를 권한 없이 처리하고, 결제 화면에 미성년 취소 가능 고지 초안을 넣되 **법적 검토 완료로 표시하지 않는다.**

---

## 11. 테스트 계약

자동 테스트가 증명해야 하는 것:

1. 구매 성공 → 서버 검증 후 권한
2. 사용자 취소 → 권한 없음
3. 결제 보류 → 권한 없음, 승인 후 부여
4. 중복 알림 멱등
5. 지연·역순 알림이 최종 스토어 스냅샷과 일치
6. 재설치·다른 기기 복원 (같은 테스트 스토어 원본 + 같은 accountId)
7. 다른 활성 계정에 이미 묶인 거래는 충돌
8. 구독 갱신, 해지 예약 후 잔여 기간 이용, 만료
9. 환불 후 권한 회수
10. 서버 장애 후 재검증 (우회 없음)
11. 계정 삭제 후 구독은 스토어에 남고 권한은 서비스에서 제거
12. 오프라인 TTL 만료 후 재검증 전 유료 권한 없음
13. 운영 환경에서 테스트 거래 거부
14. 클라이언트 성공만으로는 권한 없음

실제 App Store / Play 샌드박스에서 돌리지 않은 항목은 통과했다고 보고하지 않는다. 위 목록의 기본 증명은 **테스트 어댑터 + 인프로세스 서버**다.
