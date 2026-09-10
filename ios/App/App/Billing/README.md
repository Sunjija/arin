# iOS 결제 SDK 연결 위치

StoreKit 2 구현은 결제 담당이다. 이 브랜치는 StoreKit을 넣지 않는다.

1. 이 폴더 또는 Capacitor 플러그인에 래퍼를 둔다
2. `getNativeBillingPort()`만 교체한다
3. 서명 절차는 `docs/mobile/ios-signing.md`
