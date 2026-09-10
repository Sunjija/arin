# Android 결제 SDK 연결 위치

이 폴더는 결제 담당 소유다. 모바일 브랜치는 Play Billing을 넣지 않는다.

권장:

1. Capacitor 플러그인(예: 팀 내부 `plugins/arin-billing`)에서 BillingClient를 감싼다.
2. `src/platform/billing/port.ts`의 `getNativeBillingPort()`가 그 플러그인을 반환하게 교체한다.
3. `com.android.vending.BILLING` 권한과 `applicationId` (`app.arin.dev` 개발 / `app.arin` 운영 예정)는 결제 담당이 Gradle에 추가한다.

JS 계약: `docs/contracts/mobile-platform-v1.md` §6.
