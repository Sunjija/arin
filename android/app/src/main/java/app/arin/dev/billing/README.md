# Android 결제 SDK 연결 위치

결제 담당이 Play Billing을 이 패키지 옆에 붙인다. 모바일 브랜치는 BillingClient 의존성을 추가하지 않는다.

1. 네이티브 구현 또는 Capacitor 플러그인
2. `src/platform/billing/port.ts`의 `getNativeBillingPort()`만 교체
3. `com.android.vending.BILLING`은 결제 담당이 추가

계약: `docs/contracts/mobile-platform-v1.md` §6.
