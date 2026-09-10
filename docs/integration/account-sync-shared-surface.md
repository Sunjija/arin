# 계정 동기화 — 공용 표면

다른 작업이 Dexie 스키마·백업·문항 스냅샷을 손댈 때 이 브랜치와 겹치는 지점만 적는다. 병합하지 말고 계약을 맞춘다.

## 이 작업이 바꾸지 않는 것

- `hanguksa-coach` Dexie 버전 2 스토어 정의 (`src/db/database.ts`)
- `ExportPayload` 버전 (1|2)과 `src/db/backup.ts` 필드
- `src/types/index.ts` 학습 레코드 내부 필드
- 문항 은행·모의고사 조립·스냅샷 생성 로직

## 이 작업이 추가하는 것

- 별도 IndexedDB `arin-account-sync` (아웃박스·커서·세션 비밀·워크스페이스 스냅샷)
- `server/account-api` SQLite
- Dexie `dbcore` 미들웨어 이름 `arin-account-sync-capture` — 학습 테이블 쓰기를 이벤트로 복제만 한다
- 설정 화면 상단 `AccountPanel`

## 다른 작업이 v3 스키마/백업을 넣을 때

1. 학습 백업 JSON에 세션 토큰·이메일 원문을 넣지 말 것.
2. 새 학습 테이블이 사용자 기록이면 `src/account/workspace.ts`의 `TABLE_COLLECTIONS`와 계약 `SyncCollection`에 이름을 추가한다. 내부 필드는 불투명 payload로 전달된다.
3. 과거 시험 스냅샷 필드를 `mockResults`/`activeMock`에 넣으면 추가 매핑 없이 동기화된다. 문제은행으로 재생성하지 말 것.
4. Dexie 미들웨어를 추가로 걸 때 `arin-account-sync-capture`와 실행 순서를 맞출 것.
5. `SettingsPage`는 계정 패널을 상단에 둔다. 목표/백업 섹션 계약을 유지한다.
