# 계정 서버 운영 메모

로컬 개발용이다. 운영 배포·클라우드 과금 리소스는 이 작업에서 만들지 않았다.

## 실행

| 명령 | 의미 |
|---|---|
| `npm run dev` | 기존 미리보기. 데모 모드. 서버 저장 완료로 표시하지 않음 |
| `npm run dev:account` | Vite + 로컬 계정 API. `VITE_ARIN_ACCOUNT_MODE=connected` |
| `npm run account:api` | API만 43128 포트 |
| `npm run account:seed` | `a@arin.test` / `b@arin.test` (비밀번호 `ArinTest123!`) |
| `npm test` | 격리·중복·충돌·게스트 이관 포함 |
| `npm run typecheck` · `lint` · `build` | 기존과 동일 + server |

환경변수 예시는 저장소 루트 `.env.example`.

테스트 계정은 `ARIN_ALLOW_TEST_SEED=1`이고 `ARIN_ENV`가 production이 아닐 때만 만들어진다.

## 마이그레이션

스키마는 `server/account-api/migrate.ts`의 `MIGRATIONS` 배열이다. 앱 기동 시 `schema_migrations`에 없는 버전만 적용한다. 새 변경은 배열 뒤에 SQL을 추가한다. 기존 문을 고치지 않는다.

## 백업

서버를 잠시 멈춘 뒤:

```bash
npm run account:backup
```

`server/data/backups/arin-account-<시각>.sqlite`가 생긴다. WAL이 있으면 같이 복사한다.

수동: SQLite 파일(`ARIN_SQLITE_PATH`, 기본 `server/data/arin-account.sqlite`)을 안전한 위치로 복사한다.

## 복구

```bash
npm run account:restore -- server/data/backups/<파일>.sqlite
```

복구는 현재 파일을 덮어쓴다. 복구 전 한 번 더 백업한다.

다른 서비스로 이전: dump

```bash
sqlite3 server/data/arin-account.sqlite .dump > arin-account.sql
```

테이블이 문서화되어 있어 Postgres 등으로 옮길 수 있다. 이 작업에서 호스팅은 만들지 않았다.

데이터 지역: 파일/VM을 두는 곳이 저장 지역이다. 한국 사용자 대상이면 운영 시 한국 리전에 둔다.

## 로그

JSON 한 줄. `userId`·경로·상태만. 비밀번호·토큰·쿠키·이메일·관리자 키는 필드를 가린다. 가림에 실패하면 그 줄은 버린다.

복구 토큰은 로그에 쓰지 않는다. 개발 시 `server/data/dev-mailbox.json`에 힌트만 남길 수 있다.

## 장애

- API가 꺼져도 `npm run dev` 학습은 된다.
- 미전송 이벤트는 IndexedDB `arin-account-sync` 아웃박스에 남고, 재연결 후 재전송한다.
- 계정 삭제 실패 시 클라이언트는 오류를 보여 주고 재시도한다.

## 결제 연결

`PUT /api/account/v1/admin/entitlements/:userId` + `X-Arin-Admin-Key`. 앱에는 키를 넣지 않는다. 탈퇴 시 `account_lifecycle.event = account.deleted`. 결제 원장 보관 기간은 정하지 않는다.
