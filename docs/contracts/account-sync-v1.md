# 계정·동기화 계약 v1

상태: **구현 계약**. 이 문서의 식별자·오류 코드·어댑터 경계를 클라이언트가 import하는 타입과 맞춘다.  
기준 브랜치: `codex/release-readiness-question-roadmap` (`6575ed4`).  
담당 범위: 인증, 사용자별 접근 권한, 로컬·서버 저장 연결, 오프라인 동기화, 게스트 이관, 로그아웃·계정 변경·탈퇴, 운영 로그·백업 절차.  
비담당: 문항 검수·출처·내용 버전, 문항/해설 개선, 모의고사 조립·선지 순서, 시험 스냅샷 내부 스키마, 기존 학습 데이터 보호 버그 수정, 백업 파일 버전 승격.

문항·시험 스냅샷 **내부 필드**는 문항/모의고사 담당 계약을 따른다. 이 계층은 스냅샷을 **불투명 JSON**으로 전송한다. 현재 문제은행을 읽어 과거 시험을 재생성하지 않는다.

---

## 1. 백엔드 선정

### 조사 결과

저장소에 기존 API 서버·BaaS 클라이언트·인증 SDK는 없다. 학습 기록은 Dexie IndexedDB(`hanguksa-coach`)에만 있다.

### 선정: Hono(Node.js) + `node:sqlite`

| 기준 | 판단 |
|---|---|
| 인증·사용자별 접근 | 세션을 서버가 발급하고, 모든 읽기/쓰기를 `user_id`로 강제한다. 클라이언트 `paid`/`role` 필드는 무시한다. |
| 데이터 지역·비용 | 로컬 개발은 프로세스 옆 SQLite 파일. 비용 0. 운영 시 파일/백업을 한국 리전 VM에 두면 된다. 클라우드 과금 리소스는 이 작업에서 **생성하지 않는다**. |
| 로컬 개발·테스트 | 외부 계정 없이 `npm run dev:account`와 in-memory SQLite 테스트로 동작한다. |
| 백업·이전 | SQLite 파일 복사 + SQL dump. 스키마는 문서화된 테이블이라 Postgres 등으로 옮길 수 있다. |
| 앱 번들 비밀 | 관리자 키·DB 경로는 서버 환경변수만 사용한다. |

공식 문서에서 확인한 지원 범위:

- Hono Node.js 어댑터(18.14+ / 20+): [hono.dev/docs/getting-started/nodejs](https://hono.dev/docs/getting-started/nodejs) — `serve()` / `getRequestListener()`.
- Hono Cookie helper: [hono.dev/docs/helpers/cookie](https://hono.dev/docs/helpers/cookie) — `httpOnly` 세션 쿠키.
- Node.js `node:sqlite` `DatabaseSync`: [nodejs.org/api/sqlite](https://nodejs.org/api/sqlite.html) — Stability **1.2 (Release candidate)**. Node 22.14에서 플래그 없이 import 가능(실험 경고만 출력). 네이티브 애드온(`better-sqlite3`) 없이 로컬 설치가 된다.

검토 후 이 단계에서 쓰지 않은 것:

- Firebase / Supabase / Cognito: 외부 프로젝트·키·리전이 필요하고, “연결 완료”로 오해하기 쉽다.
- 소셜 로그인: 앱 심사·리다이렉트·모바일 복귀 경로가 준비되지 않았다. v1은 이메일+비밀번호만 제공한다.

운영 배포·유료 리소스 생성은 하지 않는다. `VITE_ARIN_ACCOUNT_MODE=connected` 이고 서버 health가 성공할 때만 “개발 서버 연결”로 표시한다. 데모 모드 저장을 서버 저장 완료처럼 표시하지 않는다.

---

## 2. 실행 모드

| 모드 | 켜는 방법 | 저장 | UI |
|---|---|---|---|
| `demo` (기본) | `npm run dev` | 이 브라우저 IndexedDB만 | “이 브라우저에만 저장됩니다” |
| `connected` | `npm run dev:account` | 로컬 SQLite + 세션 | health 성공 시에만 “개발 서버에 연결됨” |
| `test` | Vitest | `:memory:` SQLite | UI 없음 |

환경 구분은 `ARIN_ENV=development\|test\|production`. production에서 테스트 시드·복구 토큰 응답 노출을 거부한다.

---

## 3. 서비스 사용자 식별자

| 식별자 | 형식 | 규칙 |
|---|---|---|
| `userId` | `usr_` + UUID(v4, hex) | 서비스 내부 기본키. 이메일을 외래키로 쓰지 않는다. |
| `email` | 소문자·trim | 로그인 핸들. 로그에 남기지 않는다. |
| `guestDeviceId` | `gdev_` + UUID | 브라우저/앱 설치당 하나. 계정 없음. |
| `sessionId` | `ses_` + UUID | 세션 행. 토큰과 다르다. |
| `eventId` | `evt_` + UUID | 클라이언트 생성. 사용자 범위에서 유일. |
| `deviceId` | `dev_` + UUID | 동기화 주체(브라우저 프로필). `guestDeviceId`와 다를 수 있다. |
| `entitlementId` | `ent_` + UUID | 결제 담당이 붙이는 이용 권한. |

삭제된 계정의 `userId`는 재사용하지 않는다.

---

## 4. 로그인 상태와 세션 인터페이스

클라이언트·서버가 공유하는 세션 뷰(비밀번호·원문 토큰 없음):

```ts
type AccountMode = 'demo' | 'connected' | 'test'

type AuthStatus = 'guest' | 'authenticating' | 'signed-in' | 'expired' | 'locked'

interface AuthSessionView {
  status: AuthStatus
  mode: AccountMode
  userId: string | null
  emailMasked: string | null        // a***@example.com
  sessionId: string | null
  expiresAt: string | null          // ISO-8601
  entitlement: EntitlementView
  serverReachable: boolean          // health 성공
}

interface EntitlementView {
  source: 'none' | 'billing'
  plan: 'free' | 'paid'
  updatedAt: string | null
}
```

원문 세션 토큰은 `httpOnly` 쿠키 `arin_session` 또는 메모리/`account-sync` Dexie의 `sessionSecret` 칸에만 둔다. 학습 백업 JSON에 넣지 않는다.

만료: 마지막 사용 후 14일. `GET /auth/session` 또는 동기화 성공 시 슬라이딩 연장. 만료 응답은 `auth_expired`. 재로그인이 필요하다. 액세스 토큰 JWT를 쓰지 않는다(폐기·탈퇴가 즉시 반영되어야 함).

---

## 5. 인증 API

Base path: `/api/account/v1`.  
성공 JSON: `{ "ok": true, ... }`.  
실패 JSON: `{ "ok": false, "error": { "code": AccountErrorCode, "message": string } }`.  
HTTP: 400 검증, 401 인증, 403 권한, 409 충돌, 429 제한, 500 서버.

### 오류 코드

```ts
type AccountErrorCode =
  | 'validation_failed'
  | 'auth_invalid'
  | 'auth_expired'
  | 'auth_required'
  | 'auth_conflict'          // 이메일 이미 존재
  | 'reauth_required'
  | 'rate_limited'
  | 'sync_conflict'
  | 'sync_duplicate'         // 처리됨(성공과 동일하게 적용된 것으로 본다)
  | 'not_found'
  | 'forbidden'
  | 'server_unreachable'
  | 'demo_mode'
  | 'deletion_pending'
  | 'internal_error'
```

메시지에는 이메일·토큰·비밀번호를 넣지 않는다. 이메일 존재 여부는 로그인/복구에서 구분하지 않는다(`auth_invalid` 또는 복구 접수 확인만).

### 호출

| 방법 | 경로 | 인증 | 본문 |
|---|---|---|---|
| POST | `/auth/register` | 없음 | `{ email, password, ageConfirmed: true }` |
| POST | `/auth/login` | 없음 | `{ email, password }` |
| POST | `/auth/logout` | 세션 | `{}` |
| GET | `/auth/session` | 세션 | |
| POST | `/auth/recover/start` | 없음 | `{ email }` |
| POST | `/auth/recover/complete` | 없음 | `{ token, newPassword }` |
| POST | `/auth/reauthenticate` | 세션 | `{ password }` |
| POST | `/account/delete` | 세션+재인증 | `{ confirm: "DELETE", password }` |
| GET | `/health` | 없음 | |
| POST | `/sync/push` | 세션 | `{ deviceId, events: SyncEvent[] }` |
| GET | `/sync/pull?cursor=` | 세션 | |
| POST | `/guest/transfer` | 세션 | `{ guestDeviceId, events: SyncEvent[] }` |
| GET | `/entitlements` | 세션 | |
| PUT | `/admin/entitlements/{userId}` | `X-Arin-Admin-Key` | `{ plan, source }` |

비밀번호: 8자 이상. 서버는 scrypt(N=16384, r=8, p=1) + salt.  
세션 전달: Cookie `arin_session` 또는 `Authorization: Bearer <token>`. 쿠키는 `HttpOnly; Path=/; SameSite=Lax; Secure`(https).  
브라우저·모바일 공통: Bearer는 WebView/네이티브, 쿠키는 동일 출처 웹. CORS는 개발 출처만.  
소셜 로그인 엔드포인트는 v1에 없다.

가입은 `ageConfirmed === true`일 때만 받는다(만 14세 이상 고지). 생년월일은 저장하지 않는다.

복구: `recover/start`는 항상 같은 성공 메시지. 개발에서만 `ARIN_DEV_RECOVERY=1`이면 토큰을 `server/data/dev-mailbox.json`에 쓰고, JSON 응답에 토큰을 **넣지 않는 것이 기본**이다. `ARIN_ENV=development`에서 테스트 시드 사용자에 한해 `devRecoveryToken`을 응답할 수 있다. production은 거부.

재인증: 탈퇴·복구 완료 후 비밀번호 변경은 최근 5분 내 `reauthenticate` 또는 같은 요청의 `password`가 필요하다.

관리자 키는 앱 번들·`VITE_*`에 두지 않는다. 결제 서버만 `ARIN_ADMIN_KEY`로 이용 권한을 쓴다. 클라이언트가 보낸 `plan`은 버린다.

---

## 6. 클라이언트 어댑터

화면은 Dexie 학습 DB를 직접 네트워크에 보내지 않는다.

```ts
interface AuthAdapter {
  register(input: { email: string; password: string; ageConfirmed: boolean }): Promise<AuthSessionView>
  login(input: { email: string; password: string }): Promise<AuthSessionView>
  logout(): Promise<void>
  session(): Promise<AuthSessionView>
  startRecovery(email: string): Promise<void>
  completeRecovery(input: { token: string; newPassword: string }): Promise<void>
  reauthenticate(password: string): Promise<void>
  deleteAccount(input: { password: string }): Promise<void>
}

interface StorageAdapter {
  enqueue(event: SyncEvent): Promise<void>
  pending(): Promise<SyncEvent[]>
  mark(status: SyncEventStatus, eventIds: string[]): Promise<void>
  cursor(): Promise<string | null>
  setCursor(cursor: string): Promise<void>
}

interface SyncTransport {
  push(events: SyncEvent[]): Promise<PushResult>
  pull(cursor: string | null): Promise<PullResult>
  transferGuest(input: { guestDeviceId: string; events: SyncEvent[] }): Promise<PushResult>
}
```

- `DemoAuthAdapter` / `DemoSyncTransport`: 네트워크 없음. `serverReachable=false`. 상태 문구는 “데모 · 이 브라우저에만 저장”. **서버 저장 완료를 쓰지 않는다.**
- `HttpAuthAdapter` / `HttpSyncTransport`: `/api/account/v1`. 연결 실패는 `server_unreachable`.
- `DexieStorageAdapter`: 별도 IndexedDB `arin-account-sync`. 학습 DB 스키마 버전을 올리지 않는다.

로그인 복귀(앱 담당 연결점):

1. 웹: 같은 출처에서 쿠키가 자동 첨부된다. `AccountProvider`가 부팅 시 `GET /auth/session`.
2. 모바일(미래): 시스템 브라우저/에페메럴 세션이 끝나면 앱이 `arin://auth/callback#session=` 대신 **커스텀 스킴으로 토큰을 받지 않는다.** 네이티브는 자체 `Authorization` 헤더 저장소만 쓴다. v1 웹 미리보기는 콜백 URL이 필요 없다.
3. 화면 담당은 `useAccount()`의 `session`만 읽는다. 토큰에 접근하지 않는다.

---

## 7. 동기화 이벤트·중복·커서

```ts
type SyncCollection =
  | 'attempts'
  | 'wrongAnswers'
  | 'cards'
  | 'studyDays'
  | 'lessonCompletions'
  | 'settings'
  | 'mastery'
  | 'meta'
  | 'mockResults'
  | 'activeSession'
  | 'activeMock'

type SyncOp = 'upsert' | 'delete'

interface SyncEvent {
  eventId: string
  collection: SyncCollection
  entityId: string
  op: SyncOp
  clientUpdatedAt: string
  deviceId: string
  /** 학습 레코드 JSON. 스냅샷 내부는 해석하지 않는다. */
  payload: unknown
}

interface PushResult {
  accepted: Array<{ eventId: string; serverSeq: number }>
  duplicates: Array<{ eventId: string; serverSeq: number }>
  conflicts: Array<{ eventId: string; collection: SyncCollection; entityId: string; server: unknown }>
  rejected: Array<{ eventId: string; code: AccountErrorCode }>
}

interface PullResult {
  events: Array<SyncEvent & { serverSeq: number }>
  nextCursor: string
  hasMore: boolean
}
```

서버 유일 키: `(user_id, event_id)`. 같은 `eventId` 재전송은 `duplicates`로 성공 처리하고 상태를 다시 바꾸지 않는다.

커서: `sync_events.id`(단조 증가 정수)를 문자열로 둔다. 클라이언트는 `nextCursor`만 저장한다. 이벤트 재정렬에 클라이언트 시계를 쓰지 않는다.

`payload`는 해당 Dexie 행 전체다. `mockResults` / `activeMock`에 `questionSnapshots`가 있으면 그대로 싣는다. 없으면 있는 필드만 보낸다. `questions.ts`로 채우지 않는다.

---

## 8. 컬렉션별 충돌 정책

| 데이터 | 컬렉션 | 정책 |
|---|---|---|
| 풀이 기록 | `attempts` | 삽입 합집합. 같은 `entityId`는 첫 기록 유지(불변). |
| 오답 | `wrongAnswers` | 같은 id면 `clientUpdatedAt` 최신 1건. |
| 복습 카드 | `cards` | LWW `updatedAt`/`clientUpdatedAt`. |
| 학습 완료(일) | `studyDays` | 병합: `completed` OR, 횟수는 max, `finishedSessionIds` 합집합. |
| 단원 완료 | `lessonCompletions` | `firstCompletedAt` min, `lastCompletedAt` max, `completionCount` max. |
| 설정 | `settings` | LWW `clientUpdatedAt`. 동점이면 서버 기존값 유지. |
| 숙련도 | `mastery` | LWW. 서버는 권위 있는 재계산을 하지 않는다. |
| 메타 | `meta` | LWW. 시드 카드 원문은 이관하지 않고 로컬 `ensureSeeded`가 담당. |
| 과거 시험 | `mockResults` | 삽입 합집합. payload 불투명. 문제은행 재조회 금지. |
| 진행 중 학습 | `activeSession` | 양쪽 dirty이고 `updatedAt`이 다르면 `sync_conflict`. 조용히 덮지 않음. |
| 진행 중 시험 | `activeMock` | 로컬/서버 `revision` 비교. 낮으면 거절. 같고 내용이 다르면 `sync_conflict`. |

진행 중 세션/시험 충돌 시 UI는 선택을 요구한다: “이 기기 기록 유지” / “다른 기기 기록 가져오기”. 기본 자동 선택은 없다.

서버 저장 상태(아웃박스):

```ts
type SyncEventStatus = 'pending' | 'inflight' | 'acked' | 'failed' | 'conflict' | 'local-only'
```

데모 모드는 항상 `local-only`. 문구: “서버에 올리지 않음”.  
`pending`/`inflight` = 대기, `failed` = 실패(재시도), `acked` = 서버 반영, `conflict` = 충돌.

앱 종료 후: 아웃박스는 `arin-account-sync`에 남는다. 부팅 시 `pending`/`failed`를 다시 보낸다. `inflight`는 타임아웃 후 `pending`으로 되돌린다.

---

## 9. 게스트 · 로그아웃 · 탈퇴

게스트 이관:

1. 로그인 성공.
2. 게스트 학습 레코드를 이벤트로 만든다. `eventId`는 `evt_guest_{guestDeviceId}_{collection}_{entityId}` 형태로 **안정적**이게 하여 재시도가 중복 insert가 되지 않게 한다.
3. `POST /guest/transfer`.
4. 서버는 `(user_id, guest_device_id, collection, entity_id)`를 기록한다. 이미 있으면 적용을 건너뛴다.
5. pull로 계정 상태를 받아 로컬 학습 DB를 계정 워크스페이스로 교체한다.

로그아웃:

1. 아웃박스 flush 시도.
2. 실패·오프라인이면 해당 `userId` 스냅샷+아웃박스를 `arin-account-sync`에 유지한다. 학습 Dexie는 게스트 시드로 되돌린다.
3. 세션 쿠키/비밀을 지운다.
4. 다른 계정 로그인 시 이전 스냅샷을 열지 않는다.

계정 변경: 로그아웃과 동일 후 새 사용자 pull. 이전 사용자 행이 화면에 남지 않아야 한다.

탈퇴:

1. 비밀번호 재인증.
2. 서버: 세션 전부 폐기, 학습 동기화 행 삭제, `users.deleted_at` 설정, `account_lifecycle`에 `account.deleted` 기록(결제 담당 폴링용).
3. **결제 원장의 보관 기간은 정하지 않는다.** 결제 담당 계약으로 분리한다.
4. 로컬: 해당 사용자 아웃박스·스냅샷·세션 삭제 후 게스트 시드.
5. 네트워크 실패 시 요청을 `deletion-pending`으로 두고 재시도한다. 성공 전까지 로그인 상태를 유지하되 학습 업로드는 멈춘다.

---

## 10. 결제 담당 연결

결제 서버만 관리자 키로 이용 권한을 쓴다.

```http
PUT /api/account/v1/admin/entitlements/usr_...
X-Arin-Admin-Key: <ARIN_ADMIN_KEY>
{ "source": "billing", "plan": "paid", "productCode": "arin.premium", "externalRef": "ord_..." }
```

앱은 `GET /entitlements` 또는 세션 뷰의 `entitlement`만 읽는다. 클라이언트 요청 바디의 `plan`은 저장하지 않는다. 미연결 시 `plan: "free", source: "none"`.

탈퇴 시 학습 데이터는 지우고, 결제 원장은 이 API의 `account.deleted` 생명주기 이벤트를 보고 결제 담당이 처리한다.

---

## 11. 공용 타입 · Dexie · 백업 (통합 표면)

이 작업은 `hanguksa-coach` Dexie **버전 2 스키마를 변경하지 않는다.** 백업 `ExportPayload` 버전을 올리지 않는다.

추가 IndexedDB: `arin-account-sync` (아웃박스, 커서, 세션 메타, 워크스페이스 스냅샷). 학습 JSON 백업에는 포함하지 않는다.

학습 쓰기 감지는 `studyService`를 수정하지 않고 Dexie `dbcore` 미들웨어로 한다. 원격 적용 중에는 캡처를 끈다.

다른 작업이 Dexie v3 또는 백업 v3를 넣을 경우: 계정 필드를 학습 백업에 넣지 말 것, 스냅샷 필드는 불투명 payload로 자동 전달됨. 상세는 `docs/integration/account-sync-shared-surface.md`.

---

## 12. 로그 · 비밀

로그 필드: `ts`, `level`, `requestId`, `route`, `userId`, `event`, `status`.  
금지: `password`, `token`, `authorization`, `cookie`, 원문 이메일, 복구 토큰, 관리자 키.  
`ARIN_ENV=production`에서 health는 버전 문자열만. SQLite 경로는 로그에 남기지 않는다.
