# arin 모바일 앱 개발 방식

기준: `codex/release-readiness-question-roadmap` (`6575ed4`)  
공식 문서 (확인일: 2026-09-10):

- [Installing Capacitor](https://capacitorjs.com/docs/getting-started)
- [Capacitor configuration](https://capacitorjs.com/docs/config)
- [Environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Updating to 8.0](https://capacitorjs.com/docs/updating/8-0)
- [Live Reload](https://capacitorjs.com/docs/guides/live-reload)
- [Deep Links](https://capacitorjs.com/docs/guides/deep-links)
- [@capacitor/app](https://capacitorjs.com/docs/apis/app)
- [@capacitor/keyboard](https://capacitorjs.com/docs/apis/keyboard)
- [System Bars (Capacitor 8)](https://capacitorjs.com/docs/apis/system-bars)
- [@capacitor/browser](https://capacitorjs.com/docs/apis/browser)
- [@capacitor/network](https://capacitorjs.com/docs/apis/network)
- [@capacitor/preferences](https://capacitorjs.com/docs/apis/preferences)
- [@capacitor/splash-screen](https://capacitorjs.com/docs/apis/splash-screen)

저장소에 `AGENTS.md`는 없다. 병렬 개편 계약은 `docs/parallel-redesign/`을 따른다.

---

## 1. 현재 웹 앱

| 항목 | 상태 |
|---|---|
| UI | React 19 + Vite 8 + Tailwind 4 |
| 라우팅 | `react-router-dom` `BrowserRouter` |
| 로컬 저장 | Dexie IndexedDB 이름 `hanguksa-coach` |
| 모바일 CSS | `env(safe-area-inset-bottom)`, `.touch-target` 44px, 하단 탭 |
| 기존 네이티브 프로젝트 | 없음 (Cordova/Capacitor/RN 설정 없음) |
| 운영 앱 식별자 | 없음 (스토어 등록 흔적 없음) |
| 백엔드 | 없음. 학습 데이터는 브라우저/WebView IndexedDB |

브라우저 미리보기 포트는 `43127`이다. 이 경로를 제거하지 않는다.

---

## 2. 선정: Capacitor 8로 기존 웹 앱 패키징

평가 기준은 과제에 적힌 다섯 가지다.

| 기준 | Capacitor 8 | React Native / Expo | PWA만 |
|---|---|---|---|
| 기존 화면 재사용 | 동일 React 트리 | UI·라우팅·CSS 재작성 | 동일 |
| 브라우저 미리보기 | `npm run dev` 유지 | 별도 웹 타깃 필요 | 유지 |
| 인앱결제 연결 | Play Billing / StoreKit을 네이티브 플러그인으로 붙임 | 지원 | 스토어 IAP 불가에 가깝다 |
| 오프라인 저장 | WebView IndexedDB 유지. 계정만 Preferences | 저장 계층을 다시 설계 | IndexedDB |
| 유지보수 | 웹 한 코드 + 얇은 네이티브 셸 | 두 제품 | 설치형 스토어 앱이 아님 |

**결정:** Capacitor 8. 근거 없이 전체 UI를 새 프레임워크로 옮기지 않는다.

Cordova는 Capacitor가 대체하는 이전 런타임이라 새로 쓰지 않는다. Flutter/RN는 화면 재사용 요구와 충돌한다.

### Capacitor 8에서 쓰는 기능

- **System Bars** (`insetsHandling: css`): Android 가장자리 여백을 `--safe-area-inset-*` CSS 변수로 주입. 7.x `adjustMarginsForEdgeToEdge`는 제거됨.
- **Keyboard** `resize: body`, Android `resizeOnFullScreen: true`: 입력창·하단 CTA가 가리지 않게.
- **App** 생명주기, 딥링크, Android 뒤로 가기.
- **Browser**: 외부 링크는 시스템/인앱 브라우저. WebView 내부 탐색 금지.
- **Network**: 끊김·복귀 배너.
- **Preferences**: 계정 세션만. 학습 DB 대체 아님.
- **Splash Screen**: 개발용 시작 화면.
- **Live Reload** `server.url` + `cleartext`: 개발 서버 모드 전용. 운영 번들에 넣지 않음.

Android 로컬 스킴은 공식 기본값 `https`를 유지한다. Chrome 117 이후 커스텀 스킴은 path/query가 깨질 수 있어 `BrowserRouter`와 맞지 않는다.

---

## 3. 플랫폼별 실제 빌드 가능 여부

이 Cloud Agent 환경 (Linux x86_64, Node 22.14, OpenJDK 21):

| 플랫폼 | 이 환경에서 | 필요한 추가 환경 | 미완료 범위 |
|---|---|---|---|
| 웹 (브라우저 미리보기) | 가능 | 없음 | 없음 |
| Android debug APK | 가능 (SDK command-line tools + Gradle) | 로컬에서는 Android Studio Otter(2025.2.1+) 권장. Capacitor 8 공식 요구 | **이 환경에서 AVD `arin_dev`(API 36) 설치·실행까지 확인.** 실기기 USB는 없음 |
| Android Play 서명 릴리스 | 하지 않음 | 업로드 키·Play Console | 스토어 제출 금지 |
| iOS 시뮬레이터/IPA | **불가** (Xcode 없음) | macOS, **Xcode 26.0+** (Capacitor 8), Apple Developer 팀, 서명 인증서, 프로비저닝 | `npx cap add ios` 프로젝트만 생성. `xcodebuild` 미실행. 서명·아이콘 슬롯 확인은 로컬 Mac |

iOS 후속 절차는 [`docs/mobile/ios-signing.md`](./ios-signing.md).

Capacitor 8 Android 공식 요구 요약: minSdk 24, compile/target SDK 36, Gradle wrapper 8.14.x, AGP 8.13.0.

---

## 4. 저장소 (IndexedDB) — 브라우저 vs 앱

| 환경 | 엔진 | 지속성 | 앱 업데이트 후 |
|---|---|---|---|
| 데스크톱/모바일 브라우저 | Chromium/WebKit IndexedDB | 사이트 데이터. 사용자가 사이트 데이터 삭제한 경우만 소실 | 해당 없음 |
| Android WebView (Capacitor) | Chromium IndexedDB, 앱 데이터 디렉터리 | 앱 삭제 전까지 유지. OS가 WebView 데이터를 드물게 정리할 수 있음 | **applicationId가 같으면** 보통 유지 |
| iOS WKWebView | WebKit IndexedDB | 앱 컨테이너. 저장 공간 부족 시 OS가 웹 데이터를 비울 수 있음 (localStorage보다 IndexedDB가 낫지만 절대 보장은 아님) | 번들 ID가 같으면 보통 유지 |

**저장 방식은 바꾸지 않는다.** 학습 기록은 계속 Dexie다. 계정 토큰만 Preferences.

검증: `src/platform/storageProbe.ts`가 부팅 시 `db.meta` 존재 여부와 Preferences 프로브 키를 기록한다. Android 에뮬레이터에서 강제 종료 후 `previousProbeAt`과 진행 중 모의고사가 남았다. 앱에서 프로브가 사라지면 E(데이터)에 IndexedDB 백업/복원 또는 SQLite 이전을 요청한다. 모바일 담당이 DB를 교체하지 않는다.

공식 Preferences 문서: Preferences는 로컬 DB가 아니다. 대용량·복잡한 조회는 Dexie 유지.

---

## 5. 개발·운영 앱 분리

운영 식별자가 없어 **지금 빌드는 개발용**이다.

| 채널 | appId | 표시 이름 | 용도 |
|---|---|---|---|
| development | `app.arin.dev` | arin 개발 | 사이드로드, 에뮬레이터 |
| production (플레이스홀더) | `app.arin` | arin | 스토어 제출 전 `mobile/identity.json`만 바꾸고 sync |

변경 위치는 `mobile/identity.json` 한곳이다.

서명 키·Keystore·`*.jks`·`google-services.json` 비밀값·`.env*.local`은 gitignore한다. 저장소에 넣지 않는다.

---

## 6. 권한

개발 빌드 기본 권한만 둔다.

- Android: `INTERNET`, `ACCESS_NETWORK_STATE` (Network 플러그인)
- iOS: 카메라·위치·추적 설명 문자열 없음
- Billing / Sign in with Apple / 푸시는 각 담당이 추가

14세 이상 한국 사용자 대상이므로 ATT·광고 ID를 기본으로 켜지 않는다.

---

## 7. 제약과 비범위

- 문항 데이터·해설·모의고사 조립·채점 내부는 손대지 않는다
- 인증 서버·결제 검증을 구현하지 않는다
- 스토어 제출·운영 배포를 하지 않는다
- iOS 실빌드·실기기 결과를 이 Linux 환경에서 통과했다고 보고하지 않는다
- A 소유 `App.tsx` / `index.css` / `index.html`은 셸·세이프영역·딥링크 연결에 한해 최소 수정한다
