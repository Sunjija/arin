# 스토어 설정 체크리스트

실제 App Store / Play 콘솔 값과 인증 정보가 이 저장소에 없다. C가 네이티브 설정 파일을 소유한다. billing은 그 파일을 임의로 수정하지 않는다. 아래는 연결 시 필요한 항목이다.

판매를 켜지 않은 채 샌드박스만 준비한다.

## 공통

- [ ] 번들 ID / 패키지명 확정 (`com.example.arin` 가정 금지, C 계약 값 사용)
- [ ] `salesEnabled`는 명시적으로 켜기 전까지 `false`
- [ ] 운영 서버 `ARIN_BILLING_ENV=production`과 샌드박스 서버 분리
- [ ] 테스트 어댑터 거래(`test.` prefix)는 운영에서 거부되는지 배포 전 확인
- [ ] 카드 번호·영수증·JWS·서비스 계정 JSON이 로그 파이프라인에 안 들어가는지 확인

## Apple

근거: [StoreKit 2](https://developer.apple.com/storekit/), [App Store Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications), [Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/), [App Review 3.1.1 · 3.1.2](https://developer.apple.com/app-store/review/guidelines/).

- [ ] App Store Connect 앱 레코드
- [ ] Subscription Group `arin_premium`
- [ ] Auto-renewable product `arin.premium.monthly` (표시명·설명·기간, 가격은 결정 후)
- [ ] Non-renewing `arin.mockpass.30d` (유형 확정 후)
- [ ] Ask to Buy / pending 처리: `PurchaseResult.pending` + `Transaction.updates`
- [ ] App Store Server API 키 (Issuer ID, Key ID, `.p8`). 저장소에 커밋하지 않음
- [ ] 서버 알림 URL (sandbox / production 분리 가능), TLS 1.2+
- [ ] 알림 버전 **V2** (V1 deprecated)
- [ ] `appAccountToken`(UUID) ← arin `accountId` 매핑 테이블
- [ ] 구독 관리: `AppStore.showManageSubscriptions` / `https://apps.apple.com/account/subscriptions`
- [ ] 인앱결제 없이 디지털 콘텐츠를 팔지 않음 (3.1.1). 다른 결제 경로 없음

없는 인증 정보: Apple root CA를 통한 JWS 검증, API 키. 현재 Apple verifier는 **실패로 닫힌다.**

## Google

근거: [Play Billing 연동](https://developer.android.com/google/play/billing/integrate), [구독 수명주기](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [RTDN](https://developer.android.com/google/play/billing/rtdn-reference), [subscriptionsv2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2).

- [ ] Play Console 앱, 패키지명
- [ ] Billing Library 7+ (pending prepaid 지원은 7+)
- [ ] Subscription `arin_premium_monthly` + base plan
- [ ] 30일 이용권 SKU 유형 확정 (one-time managed vs prepaid)
- [ ] 라이선스 테스터 계정
- [ ] Play Developer API 서비스 계정, `androidpublisher` 범위. JSON은 시크릿 저장소만
- [ ] RTDN Pub/Sub 주제와 푸시 엔드포인트 `/v1/billing/notifications/google`
- [ ] `setObfuscatedAccountId`에 arin 계정 지문
- [ ] 구매 확인(acknowledge) 3일 제한 — 서버가 권한 부여 후 확인
- [ ] PENDING → PURCHASED 전까지 권한 없음
- [ ] 구독 관리 딥링크 `https://play.google.com/store/account/subscriptions`

없는 인증 정보: 서비스 계정. 현재 Google verifier는 **실패로 닫힌다.**

## 환경 변수 (제안, C·B와 합의)

```text
ARIN_BILLING_ENV=test|sandbox|production
ARIN_BILLING_SALES_ENABLED=false
ARIN_BILLING_OFFLINE_TTL_MS=172800000
APPLE_BUNDLE_ID=
APPLE_IAP_ISSUER_ID=
APPLE_IAP_KEY_ID=
APPLE_IAP_PRIVATE_KEY=         # 파일 경로 또는 시크릿, 로그 금지
GOOGLE_PLAY_PACKAGE_NAME=
GOOGLE_PLAY_SERVICE_ACCOUNT=   # 파일 경로, 로그 금지
```

웹 미리보기는 `ARIN_BILLING_ENV=test`와 테스트 어댑터만 사용한다.
