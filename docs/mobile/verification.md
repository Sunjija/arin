# 모바일 검증 기록

환경: Cloud Agent Linux x86_64, Node 22.14, OpenJDK 21. 검증일: 2026-09-10.  
저장소 브랜치: `work/mobile-app`.  
에뮬레이터: AVD `arin_dev`, Android 16 (API 36), `sdk_gphone64_x86_64`, 패키지 `app.arin.dev` 0.1.0 debug.

실행한 것과 실행하지 않은 것을 섞어 보고하지 않는다.

## 브라우저 — 실행함

| 항목 | 결과 | 메모 |
|---|---|---|
| `npm test` | 통과 | 플랫폼 계약·딥링크 포함. 문항 검수 리포트 파일은 커밋하지 않음 |
| `npm run typecheck` | 통과 | |
| `npx oxlint src` | 통과 | |
| `npm run build` | 통과 | `dist/` |
| `npm run dev` 데모 배너 | 통과 | http://127.0.0.1:43127 — **데모 · 서버 없음** |
| 오늘 화면 390×844 | 통과 | 가로 넘침 없음 (`scrollWidth === clientWidth`) |
| 테스트 로그인 | 통과 | 배너가 **테스트 사용자** / 테스트 로그아웃으로 바뀜 |
| 실전 준비 `/mock` | 통과 | 하단 탭·시작 CTA 표시 |
| 설정 숫자 입력 | 통과 | 목표 점수 필드 포커스. OS 키보드 패널은 브라우저 한계로 미재현 |
| `/auth/callback?code=preview` | 통과 | 세션 저장 후 `/`로 복귀 |
| 오프라인 배너 | 통과 | `offline` 이벤트 — “네트워크가 끊겼습니다…” |
| 데스크톱 1280 | 통과 | 데모 배너 유지, 상단 메뉴 |

## Android — 빌드·에뮬레이터 실행함, 실기기는 없음

| 항목 | 결과 | 메모 |
|---|---|---|
| `npx cap add android` / sync | 통과 | |
| `assembleDebug` | 통과 | Gradle 8.14.3, compileSdk 36 |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk` | 복사 `artifacts/mobile/arin-dev-debug.apk` (gitignore) |
| 패키지 | `app.arin.dev` | versionName `0.1.0`, label `arin 개발` |
| 권한 | `INTERNET`, `ACCESS_NETWORK_STATE` | 카메라·위치 없음 |
| 에뮬레이터 설치 | **통과** | `/dev/kvm` world-writable 후 AVD `arin_dev` 부팅. `adb install -r` Success |
| 홈 실행 | **통과** | 배너 **데모 · 서버 없음** / **Android 앱 · 로그인 없음**. WebView `https://localhost/` |
| IndexedDB·Preferences | **통과** | `window.__arinStorageProbe`: IndexedDB meta 있음, Preferences 왕복 성공. 강제 종료 후 `previousProbeAt` 유지 |
| 가로 넘침 | **통과** | `scrollWidth === clientWidth` (412 CSS px). 시스템 글자 1.3배에서도 가로 넘침 없음 |
| 딥링크 `arin://app/mock` | **통과** | 실전 준비 화면 |
| 딥링크 `arin://app/settings` | **통과** | 이후 `arin://app/mock` → 다시 settings도 `/settings` 유지 (런치 URL 덮어쓰기 수정) |
| 딥링크 `arin://auth/callback?code=emu-verify` | **통과** | 홈 복귀, 배너 **Android 앱 · 테스트 사용자** |
| 설정 숫자 키보드 | **통과** | `--keyboard-height: 296px`, `body.keyboard-open`, 하단 탭 숨김, 목표 점수 필드가 키보드 위로 스크롤 |
| 비행기 모드 | **통과** | 홈에서 빨간 오프라인 배너. 연결 복구 후 배너 제거 |
| 실기기 USB | **미실행** | 연결된 휴대폰 없음 |

### 시험 흐름 (에뮬레이터에서 실행함)

기기/OS: Android Emulator 16 / `sdk_gphone64_x86_64`  
앱 빌드: `app.arin.dev` debug 0.1.0

| # | 절차 | 결과 |
|---|---|---|
| 1 | 10문항 연습 시작 후 홈 키 → 다시 앱 | **통과.** 시험 화면 유지, 타이머 계속 (15:59 → 15:54) |
| 2 | 시험 중 전원 키로 화면 끄기 → 깨우기 | **통과.** 같은 문항·타이머로 복귀 (15:10 → 15:04) |
| 3 | 시험 중 Android 뒤로 가기 | **통과.** 제출하지 않고 준비 화면. **이어서 풀기** / 진행 중인 시험 |
| 4 | `am force-stop` 후 재실행 → `arin://app/mock` | **통과.** IndexedDB의 진행 세션 유지, **이어서 풀기** 표시 |
| 5 | 비행기 모드 (홈) | **통과.** 오프라인 배너. 학습 데이터 안내 문구 표시 |
| 6 | 16분 대기 후 시간 종료 자동 제출 | **미실행.** 타이머 UI(남은 시간)만 확인. `deadlineAt` 만료·`finalizeMock`은 D 소유. 16분을 기다리지 않음 |

강제 종료 시 응답 수는 0문항이었다(보기 탭이 CDP `return` 구문 오류로 저장되지 않음). 세션 자체는 `startMock` 직후 IndexedDB에 남아 있다. pause 경로에 기존 `saver.flush()`를 연결해 두었으니, 응답 저장 레이스는 D가 `saveMockProgress`로 재확인하면 된다.

### 에뮬레이터에서 발견한 플랫폼 결함 (수정함)

`AppUrlListener`가 `useNavigate()` 의존으로 effect가 다시 돌 때마다 `getLaunchUrl()`을 적용했다. Capacitor가 돌려주는 값이 `arin://app/`이면 이후 `arin://app/settings` 같은 `appUrlOpen`을 홈으로 덮어썼다. 런치 URL은 한 번만 소비하고, `appUrlOpen`이 우선이다.

## iOS

| 항목 | 결과 |
|---|---|
| `npx cap add ios` 스캐폴드 | 생성함. SPM, 스킴 `arin`, PrivacyInfo `CA92.1` |
| `xcodebuild` / 시뮬레이터 / 실기기 | **미실행**. 통과로 보고하지 않음 |

## 산출물 위치

- 웹 번들: `dist/`
- Android debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- 복사본: `artifacts/mobile/arin-dev-debug.apk` (저장소에 올리지 않음)
- 설치: `adb install -r artifacts/mobile/arin-dev-debug.apk`
- 에뮬레이터: `emulator -avd arin_dev -gpu swiftshader_indirect`
