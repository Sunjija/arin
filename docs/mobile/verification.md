# 모바일 검증 기록

환경: Cloud Agent Linux, Node 22, OpenJDK 21. iOS/Xcode 없음.

실행한 것과 실행하지 않은 것을 섞어 보고하지 않는다.

## 브라우저

| 항목 | 결과 | 메모 |
|---|---|---|
| `npm test` | (빌드 후 기입) | |
| `npm run typecheck` | | |
| `npm run lint` | | |
| `npm run build` | | `dist/` |
| `npm run dev` 데모 배너 | | |
| 오늘·실전·설정 화면 | | |
| `/auth/callback?code=preview` | | |
| 오프라인 배너 (`offline` 시뮬레이션) | | DevTools |

## Android (이 환경에서 가능한 범위)

| 항목 | 결과 | 메모 |
|---|---|---|
| `npx cap add android` / sync | | |
| `assembleDebug` APK | | 경로 기입 |
| 에뮬레이터 실행 | 미실행 예상 | KVM/그래픽 제약 시 |
| 실기기 설치 | 미실행 | USB 기기 없음 |
| IndexedDB 재실행 후 유지 | 미실행(실기기) | 코드 경로: `runStorageProbe` |
| 백그라운드·잠금·강제종료 | 미실행(실기기) | 연결은 MockExamPage pause 가드 |

## iOS

| 항목 | 결과 |
|---|---|
| `npx cap add ios` 스캐폴드 | |
| `xcodebuild` / 시뮬레이터 / 실기기 | **미실행**. 통과로 보고하지 않음 |

## 시험 흐름 (앱 고유 — 실기기 필요)

재현 템플릿은 [`handoff.md`](./handoff.md). 이 환경에서 에뮬레이터를 띄우지 못하면 아래는 **미검증**이다.

1. 시험 도중 홈 버튼 후 복귀
2. 화면 잠금 후 복귀
3. 앱 강제 종료 후 이어 풀기 (`activeMock`)
4. 비행기 모드
5. 시간 종료 자동 제출 (D 기존 `deadlineAt`)
6. Android 뒤로 가기 → 준비 화면 (제출 아님)

## 산출물 위치

- 웹: `dist/`
- Android debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- 복사본: `artifacts/mobile/arin-dev-debug.apk` (gitignore)
