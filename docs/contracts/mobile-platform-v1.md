# 모바일 플랫폼 계약 v1

작성 브랜치: `work/mobile-app`  
기준 브랜치: `codex/release-readiness-question-roadmap`  
상태: 구현과 함께 동결한다. 인증·결제 시스템을 이 계약에서 새로 만들지 않는다.

이 문서는 B(계정 동기화)·결제 담당이 네이티브 SDK를 붙일 위치와, 웹 미리보기와 설치형 앱이 공유하는 런타임 경계를 정한다.

---

## 1. 선택한 앱 런타임

**Capacitor 8** (`@capacitor/core` 및 동일 메이저 플랫폼 패키지).

기존 React 19 + Vite 웹 앱을 WebView에 올려 Android·iOS 설치 패키지를 만든다. 브라우저 `npm run dev` 미리보기는 유지한다. UI를 React Native 등으로 다시 쓰지 않는다.

선정 이유·기각 대안·환경 제약은 [`docs/mobile/architecture.md`](../mobile/architecture.md)에 둔다.

| 구분 | 값 |
|---|---|
| 웹 번들 출력 | `dist/` (`webDir`) |
| Android 로컬 스킴 | `https` + hostname `localhost` (라우팅·IndexedDB 보안 컨텍스트 유지) |
| iOS 로컬 스킴 | `capacitor` |
| 개발 앱 식별자 | `app.arin.dev` (운영 스토어 ID는 저장소에 없음. 플레이스홀더 `app.arin`) |
| 커스텀 URL 스킴 | `arin` |

식별자 단일 출처: [`mobile/identity.json`](../../mobile/identity.json). `capacitor.config.ts`와 네이티브 프로젝트는 이 값을 따른다.

---

## 2. 딥링크 주소 체계

앱이 처리하는 URL은 아래만 약속한다. 그 외 HTTPS 호스트는 운영 도메인 확보 후 이 계약을 개정한다.

### 2.1 커스텀 스킴 (개발·실기기 복귀용, 지금 구현)

```
arin://app/<path>              앱 내부 화면
arin://auth/callback           외부 로그인 복귀
arin://auth/callback?<query>   콜백 파라미터 (code, state, error 등)
```

`<path>`는 웹 라우터 pathname과 같다. 예:

| URL | 화면 |
|---|---|
| `arin://app/` | 오늘 `/` |
| `arin://app/study` | 학습 |
| `arin://app/mock` | 실전 |
| `arin://app/settings` | 설정 |
| `arin://app/auth/callback` | 로그인 복귀 (스킴 형식과 동일 처리) |

쿼리·해시는 웹 라우터에 그대로 전달한다.

### 2.2 HTTPS 앱 링크 (후속, 호스트 미보유)

운영 도메인이 정해지면 같은 path를 HTTPS로 연다.

```
https://<운영도메인>/<path>
https://<운영도메인>/auth/callback
```

필요 파일 (아직 호스팅하지 않음):

- Android: `https://<운영도메인>/.well-known/assetlinks.json`
- iOS: `https://<운영도메인>/.well-known/apple-app-site-association`

개발용 패키지 이름 `app.arin.dev`와 운영 패키지 `app.arin`을 구분해 지문에 넣는다.

### 2.3 수신 순서

1. `@capacitor/app` `appUrlOpen` 또는 콜드 스타트 `getLaunchUrl()`
2. `src/platform/deepLinks.ts`가 URL을 `AppRouteIntent`로 파싱
3. `auth/callback`이면 계정 어댑터 `completeFromCallback(url)` 호출 후 복귀 화면으로 이동
4. 그 외 `arin://app/...`이면 React Router `navigate(pathname + search + hash)`
5. 파싱 실패 시 무시하고 현재 화면 유지. 인증 UI를 새로 만들지 않는다

---

## 3. 외부 로그인 후 앱 복귀

인증 서버·OAuth 클라이언트는 **만들지 않는다.** B의 account-sync 계약이 오면 어댑터만 교체한다. 현재 저장소에는 account-sync 계약이 없다.

### 3.1 흐름

```
앱 세션 필요
  → AccountSyncPort.startExternalLogin({ redirectUri })
  → 포트가 외부 브라우저/인앱 브라우저를 연다 (구현은 B)
  → 공급자가 redirectUri로 복귀
  → 딥링크가 앱을 연다
  → AccountSyncPort.completeFromCallback(url)
  → 세션을 AccountSessionStore에 저장
  → 호출 화면 또는 `/`로 복귀
```

개발용 `redirectUri` 기본값: `arin://auth/callback`.

웹 미리보기에서는 같은 path `/auth/callback`을 쓴다. 브라우저에는 커스텀 스킴이 없으므로 B가 웹 콜백 URL을 별도로 넣을 수 있다.

### 3.2 테스트 어댑터 (현재 구현)

파일: `src/platform/accountSync/testAdapter.ts`  
교체 지점: `src/platform/accountSync/index.ts`의 `getAccountSyncPort()`.

테스트 어댑터 동작:

- `startExternalLogin`은 실제 IdP를 열지 않고, 개발 배너에서 “테스트 로그인”을 누를 수 있게 한다
- `completeFromCallback`은 URL에서 `code`/`error`만 읽고, 세션 JSON을 저장한다
- 네트워크 계정 DB·토큰 갱신·로그아웃 서버 API는 없다

B가 실구현을 넣을 때 `getAccountSyncPort()`만 바꾸면 된다. 딥링크 파서와 세션 저장소 인터페이스는 유지한다.

---

## 4. 인증 정보 보관 인터페이스

학습 기록(문항 진도·모의 세션)은 기존 **Dexie / IndexedDB** (`hanguksa-coach`)를 유지한다. 계정 토큰을 IndexedDB에 섞지 않는다.

```ts
export interface AccountSession {
  /** 로컬 테스트 식별자. 서버 사용자 id가 오면 B가 필드를 확장한다. */
  localId: string
  displayName: string | null
  /** 원문 토큰. 테스트 어댑터만 사용. 운영에서는 B가 암호화/만료를 정의한다. */
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  provider: 'test' | 'pending-b'
}

export interface AccountSessionStore {
  getSession(): Promise<AccountSession | null>
  setSession(session: AccountSession): Promise<void>
  clearSession(): Promise<void>
}
```

구현:

| 환경 | 저장소 |
|---|---|
| Capacitor native | `@capacitor/preferences` (iOS UserDefaults / Android SharedPreferences) |
| 웹 미리보기 | `localStorage` 키 `arin.account.session` (Preferences 웹 폴백과 동일 계열) |

주의 (공식 Preferences 문서): `localStorage`는 모바일 OS가 비울 수 있으므로 **네이티브에서는 Preferences를 쓴다.** 대용량 학습 데이터용 DB가 아니다.

iOS 스토어 제출 시 Preferences 사용 이유 `CA92.1`를 `PrivacyInfo.xcprivacy`에 적는다. 개발용 프로젝트에 템플릿을 둔다.

---

## 5. 앱 생명주기·네트워크 상태 이벤트

화면 담당은 `@capacitor/*`를 직접 import하지 말고 `src/platform/lifecycle.ts`를 쓴다. 웹에서는 `visibilitychange` / `navigator.onLine`으로 폴백한다.

```ts
export type AppLifecycleState = {
  isActive: boolean
  source: 'native' | 'web'
}

export type NetworkSnapshot = {
  connected: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

export type PlatformUnsubscribe = () => void

onAppStateChange(listener: (state: AppLifecycleState) => void): PlatformUnsubscribe
onPause(listener: () => void): PlatformUnsubscribe
onResume(listener: () => void): PlatformUnsubscribe
onNetworkChange(listener: (status: NetworkSnapshot) => void): PlatformUnsubscribe
getNetworkSnapshot(): Promise<NetworkSnapshot>
```

### 5.1 시험·학습 연결 규칙 (내부 로직 비소유)

모의고사 타이머·채점·스냅샷은 D/E 소유다. 플랫폼은 이벤트만 전달한다.

| 이벤트 | 기대 소비 |
|---|---|
| `pause` / `isActive: false` | 진행 중 시험·학습은 **기존** `saveMockProgress` / `saveSession`을 호출 |
| `resume` / `isActive: true` | 만료된 시험은 기존 `finalizeMock` 경로가 처리. 새 타이머를 만들지 않음 |
| 프로세스 종료 후 재실행 | IndexedDB `activeMock` / `activeSession`으로 기존 재개 UI가 복원 |
| `connected: false` | 전역 오프라인 표시만. 제출 실패 코드는 D의 `save-failed` 계약 유지 |
| Android `backButton` | `src/platform/backButton.ts` 가드 스택. 포커스 화면이 가드를 등록하면 이탈 확인. 등록이 없으면 history.back 또는 앱 종료 |

D가 가드를 등록하지 않으면 하드웨어 뒤로 가기가 시험 중 history.back이 될 수 있다. 재현·로그는 [`docs/mobile/handoff.md`](../mobile/handoff.md).

---

## 6. 결제 담당자가 네이티브 SDK를 연결하는 위치

인앱결제 검증·상품 카탈로그·영수증은 **이 작업 범위 밖**이다. 연결 포트만 둔다.

### 6.1 JS 포트

`src/platform/billing/port.ts`

```ts
export interface NativeBillingPort {
  /** Play Billing / StoreKit 초기화. 미연결이면 `{ ok: false, code: 'not-wired' }` */
  connect(): Promise<BillingConnectResult>
  getProducts(ids: string[]): Promise<BillingProduct[] | { ok: false; code: 'not-wired' }>
  purchase(id: string): Promise<BillingPurchaseResult>
  restore(): Promise<BillingPurchaseResult>
}

export function getNativeBillingPort(): NativeBillingPort
```

현재 `getNativeBillingPort()`는 `not-wired` 스텁이다. 결제 담당은 이 함수 구현체만 교체한다. UI 상품 화면을 여기서 추가하지 않는다.

### 6.2 네이티브 삽입 위치

| 플랫폼 | 위치 | 담당 |
|---|---|---|
| Android | `android/app/src/main/java/app/arin/dev/billing/` (README만 존재) | 결제 |
| iOS | `ios/App/App/Billing/` (README만 존재) | 결제 |
| Capacitor 플러그인 래퍼 | 신규 `plugins/arin-billing` 권장. `src/platform/billing/port.ts`에서 import | 결제 |
| 식별자·권한 | `mobile/identity.json`, Android `INTERNET`만 기본. BILLING 권한은 결제 담당이 Gradle에 추가 | 결제 / 모바일 식별자는 모바일 담당 |

Play Billing Library / StoreKit 2 의존성을 모바일 브랜치에 미리 넣지 않는다.

---

## 7. 플랫폼별 설정 파일과 변경 담당 범위

| 파일 | 역할 | 변경 담당 |
|---|---|---|
| `mobile/identity.json` | 앱 ID·표시 이름·스킴 단일 출처 | 모바일 |
| `capacitor.config.ts` | webDir, 플러그인, System Bars, Keyboard, Splash | 모바일 |
| `android/**` | 개발용 Android 프로젝트. 권한·딥링크 intent-filter | 모바일. 결제 권한은 결제 |
| `ios/**` | Xcode 프로젝트 스캐폴드. 서명·팀 ID는 미완 | 모바일 스캐폴드 / 서명는 로컬 macOS |
| `.env.example` | `VITE_RUNTIME_MODE`, `VITE_API_BASE_URL`, `VITE_DEV_SERVER_URL` | 모바일. 비밀키 금지 |
| `src/platform/**` | 런타임 어댑터 | 모바일 |
| `src/index.css`, `index.html` viewport | safe-area, 키보드, 넘침 | 모바일 (A 소유 파일에 최소 패치) |
| `src/App.tsx` | 플랫폼 부트스트랩, `/auth/callback` 라우트 | 모바일 최소 패치 (A 소유) |
| `src/pages/MockExamPage.tsx` | pause 시 기존 persist, 뒤로 가기 가드 | 모바일 연결만. 채점 로직 금지 |
| `src/pages/StudySessionPage.tsx` | 동일 | 모바일 연결만 |
| `src/db/**`, `src/lib/mockSession.ts` | IndexedDB 스키마·시험 저장 | **금지.** 문제 시 핸드오프 |
| 문항·해설·모의 조립 | `src/data/**`, mock 내부 | **금지** |
| 계정 실구현 | B account-sync | B. 지금은 테스트 어댑터 |

---

## 8. 브라우저와 앱의 환경변수 경계

Vite는 빌드 시 `import.meta.env.VITE_*`만 웹 번들에 넣는다. 네이티브 서명 키·Keystore 비밀번호·OAuth client secret은 번들에 넣지 않는다.

| 변수 | 브라우저 데모 | 앱 개발 빌드(번들) | 앱 라이브 리로드 |
|---|---|---|---|
| `VITE_RUNTIME_MODE` | `demo` (기본) | `demo` | `live` |
| `VITE_API_BASE_URL` | 비움 = 로컬 전용 | 비움 | B 서버가 생기면 설정 |
| `CAPACITOR_LIVE_RELOAD_URL` | 없음 | 없음 | Vite `http://<LAN>:43127` → `server.url` |

`demo`는 서버 없이 UI·IndexedDB만 쓴다. 배너에 **데모 · 서버 없음**을 표시한다.  
`live`는 개발 서버(현재는 Vite, 이후 API)에 붙는다. 배너에 **개발 서버**를 표시한다.

---

## 9. 버전 규칙

계약 변경은 이 파일을 고치고 영향 담당(B, 결제, D)에 알린다. 패치 수준 구현 수정은 `mobile-platform-v1` 이름을 유지한다. 스킴이나 세션 필드 breaking change는 `v2` 문서를 추가한다.
