# 모바일 → B·D·E 핸드오프

모바일 담당이 인증·결제·문항·모의고사 내부를 구현하지 않는다. 여기서는 필요한 인터페이스와, 검증 중 발견한 재현 절차만 적는다.

## B — account-sync

저장소에 account-sync 계약 파일이 없다. 현재는 `src/platform/accountSync/testAdapter.ts`다.

교체 지점: `src/platform/accountSync/index.ts` → `getAccountSyncPort()`.

B에 필요한 입력:

- 복귀 URI: `arin://auth/callback` (앱), 웹은 `/auth/callback`
- 세션 저장: `AccountSessionStore` (`src/platform/accountSync/sessionStore.ts`)
- 딥링크 파서: `src/platform/deepLinks.ts` — `kind: 'auth-callback'`

B가 정해야 할 것:

- IdP authorize URL, PKCE, 토큰 엔드포인트
- 웹용 HTTPS 콜백
- 세션 필드 확장 (서버 user id). breaking이면 `docs/contracts/mobile-platform-v2.md`

## D — 모의고사 앱 이벤트

내부 타이머·스냅샷은 그대로 둔다. 플랫폼은 `pause`에서 기존 `saveMockProgress`를 호출하도록 페이지에 연결한다.

D가 확인/보강할 점:

1. 백그라운드 전환 직후 `revision` 저장이 끝나는지 (flush)
2. 화면 잠금 후 `deadlineAt` 기준 자동 제출이 기존 `finalizeMock`만 쓰는지
3. 강제 종료 후 `getActiveMock` 재개
4. 하드웨어 뒤로 가기 가드가 준비 화면으로만 나가는지 (제출 아님)

재현 템플릿:

```
기기/OS:
앱 빌드: app.arin.dev debug / 브라우저
절차:
1.
2.
기대:
실제:
로그: adb logcat / Safari Web Inspector
필요한 플랫폼 이벤트: pause | resume | backButton | networkStatusChange
```

발견된 결함은 이 파일 아래에 날짜와 함께 추가한다.

## E — 저장소

학습 데이터는 Dexie IndexedDB `hanguksa-coach`를 유지한다. 스키마를 바꾸지 않는다.

앱에서 업데이트 후 `db.meta` 또는 활성 세션이 비면:

- 재현: 개발 APK 설치 → 학습 1회 → 같은 applicationId로 새 debug APK 덮어쓰기 → 기록 확인
- 요청: 웹뷰 데이터 유실 시 SQLite/공식 백업 경로. 모바일은 Dexie를 임의 교체하지 않음

## 결제

`src/platform/billing/port.ts`가 `not-wired`를 반환한다. SDK는 `android/app/src/main/java/app/arin/dev/billing/` · `ios/App/App/Billing/` README를 따른다.
