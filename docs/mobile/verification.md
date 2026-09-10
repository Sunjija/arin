# 모바일 검증 기록

환경: Cloud Agent Linux x86_64, Node 22.14, OpenJDK 21. 검증일: 2026-09-10.  
저장소 HEAD: `work/mobile-app`.

실행한 것과 실행하지 않은 것을 섞어 보고하지 않는다.

## 브라우저 — 실행함

| 항목 | 결과 | 메모 |
|---|---|---|
| `npm test` | 통과 | 39 files / 169 tests |
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

## Android — 빌드는 실행함, 실행은 별도

| 항목 | 결과 | 메모 |
|---|---|---|
| `npx cap add android` / sync | 통과 | |
| `assembleDebug` | 통과 | Gradle 8.14.3, compileSdk 36, 273 tasks |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk` (6.3MB) | 복사 `artifacts/mobile/arin-dev-debug.apk` (gitignore) |
| 패키지 | `app.arin.dev` | versionName `0.1.0`, label `arin 개발` |
| 권한 | `INTERNET`, `ACCESS_NETWORK_STATE` | 카메라·위치 없음 |
| 에뮬레이터 실행 | 이 기록 작성 시점 미완료 | `/dev/kvm`은 있음. 시스템 이미지 설치 후 별도 시도 |
| 실기기 설치 | **미실행** | USB 기기 없음 |
| IndexedDB 재실행 후 유지 | **미실행(실기기/에뮬)** | 코드: `runStorageProbe` → `window.__arinStorageProbe` |
| 백그라운드·잠금·강제종료 | **미실행(실기기/에뮬)** | Mock/Study `pause`에서 기존 save 호출, 뒤로 가기 가드 등록 |

## iOS

| 항목 | 결과 |
|---|---|
| `npx cap add ios` 스캐폴드 | 생성함. SPM, 스킴 `arin`, PrivacyInfo `CA92.1` |
| `xcodebuild` / 시뮬레이터 / 실기기 | **미실행**. 통과로 보고하지 않음 |

## 시험 흐름 (앱 고유)

재현 템플릿은 [`handoff.md`](./handoff.md). 아래는 이 Linux 환경에서 **앱으로 미검증**이다. 브라우저에서는 실전 준비 화면만 확인했다.

1. 시험 도중 홈 버튼 후 복귀
2. 화면 잠금 후 복귀
3. 앱 강제 종료 후 이어 풀기 (`activeMock`)
4. 비행기 모드
5. 시간 종료 자동 제출 (D 기존 `deadlineAt`)
6. Android 뒤로 가기 → 준비 화면 (제출 아님)

## 산출물 위치

- 웹 번들: `dist/`
- Android debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- 복사본: `artifacts/mobile/arin-dev-debug.apk` (저장소에 올리지 않음)
- 설치: `adb install -r artifacts/mobile/arin-dev-debug.apk`
