# iOS 결제 SDK 연결 위치

StoreKit 2 / 원 앱 내 구입 구현은 결제 담당이다. 이 브랜치는 StoreKit을 넣지 않는다.

권장:

1. `ios/App/App/Billing/`에 StoreKit 래퍼를 두거나 Capacitor 플러그인으로 노출한다.
2. `getNativeBillingPort()`만 교체한다.
3. 서명·팀 ID는 [`ios-signing.md`](./ios-signing.md).
