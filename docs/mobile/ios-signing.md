# iOS 빌드·서명 (후속, 이 환경에서 미완료)

Capacitor 8 공식 요구: **Xcode 26.0+**, iOS deployment target **15.0**, 기본 의존성 관리자는 Swift Package Manager. CocoaPods는 `npx cap add ios --packagemanager CocoaPods`로만 사용한다.

이 저장소의 Linux CI/Cloud Agent에서는 `xcodebuild`를 실행하지 않는다. `ios/` 폴더는 프로젝트 스캐폴드다.

## 로컬 Mac에서 할 일

1. Xcode 26 이상 설치, Command Line Tools, 개발자 계정 로그인.
2. `npm ci && npm run build && npx cap sync ios`
3. `npx cap open ios`
4. Signing & Capabilities
   - Team: Apple Developer 팀
   - Bundle ID: `mobile/identity.json` → `development.iosBundleId` (`app.arin.dev`)
   - 자동 서명으로 개발용 기기/시뮬레이터 설치
5. URL Types: 스킴 `arin` (딥링크). Associated Domains는 운영 도메인 확보 후 `applinks:<도메인>`
6. `ios/App/PrivacyInfo.xcprivacy` — Preferences 사용 이유 `CA92.1` 템플릿 유지
7. 시뮬레이터 또는 USB 기기에서 검증 목록은 `docs/mobile/verification.md`

## 미완료 범위 (이 브랜치)

- IPA 아카이브, TestFlight, App Store 제출
- 배포용 인증서·프로비저닝 프로파일을 저장소에 넣지 않음
- Universal Links `apple-app-site-association` 호스팅
- 실기기/시뮬레이터 실행 증거 — 보고하지 않음
