# P1-04 · 자료실 확인 문제 중단·이어하기 UI

기준 SHA: `0b56a6d7d5b71d9b1d52503348ef7e9c19eec6a4`  
작업 브랜치: `cursor/p1-library-resume`  
확인일: 2026-09-11  
담당: Cursor (허용 파일만)

허용 변경: `src/components/library/LessonPractice.tsx`, `src/components/library/LessonPractice.test.tsx`, 본 보고서.

## 1. 변경 요지

`LessonPractice`가 `recordAnswer`를 직접 호출하지 않고, E가 구현한 `libraryPractice` API만 소비한다.

| 동작 | API |
|---|---|
| 최초/재진입 조회 | `getLibraryPractice` |
| 시작 | `startLibraryPractice` |
| 선택 저장 | `selectLibraryChoice` |
| 제출·채점 | `submitLibraryAnswer` |
| 다음/결과 | `advanceLibraryPractice` |
| 완료 후 다시 풀기 | `restartLibraryPractice` |

- 문항·보기·해설은 세션의 `questionSnapshots`만 렌더링한다.
- API 성공 반환값으로만 UI를 갱신한다. 클릭 잠금으로 이중 제출을 막는다.
- 저장 실패 시 이전 단계·선택을 유지하고 해설/결과를 새로 공개하지 않는다.
- 오류에 `다른 창`이 있으면 **저장된 진행 다시 불러오기**(`getLibraryPractice`)를 제공한다. 자동 덮어쓰지 않는다.
- `lessonId` 변경·언마운트 후 지연 응답은 generation 가드로 무시한다. 다음 요청에는 반환된 `revision`을 쓴다.
- 빈 단원(`questions` 0건)은 기존처럼 렌더하지 않는다.
- 화면 문구는 이어하기·저장 실패 중심으로 두고, 내부 ID·숙련/실전 점수 과장을 넣지 않았다.

## 2. 수용 기준별 증거

| 기준 | 증거 |
|---|---|
| 단원 한정·해설 숨김·결과 | `runs only the chosen lesson…` — lesson-01만, 제출 전 해설 없음, 결과 `8/8`, attempts=8·source=`library`, lessonCompletions=0, `libraryPractice.step=result` |
| 저장 실패·재시도 | `keeps feedback hidden on storage failure…` — mastery put 실패 시 해설 비공개·attempts=0, 재시도 후 1건 |
| 선택 복원 | `restores an unsubmitted selection…` — unmount/remount 후 selectedIndex=1, 해설 없음, attempts=0 |
| 해설 복원·중복 시도 없음 | `restores feedback after remount…` — feedback 복원, attempts 유지 1 |
| 다음 단계 저장 실패 | `keeps the feedback step when advancing fails…` — put 실패 후 feedback 유지, 재시도로 다음 문항 |
| 결과 복원·명시적 다시 풀기 | `restores the result screen…` — 결과 복원 후 다시 풀기 시 새 session id, attempts 보존 |
| lessonId 변경 | `ignores a delayed load…` — lesson-01 지연 응답이 lesson-02 intro를 덮지 않음 |
| 초기 로드 실패/재시도 | `shows a load failure and recovers with retry` |
| 다중 창 충돌 | `offers reload when another window…` — `다른 창` 안내 + 다시 불러오기, 자동 덮어쓰기 없음 |

검증은 `fake-indexeddb` 실저장 기준이며, UI 구현을 mock으로 대체하지 않았다.

## 3. 검증 명령·결과

Node: `/Users/daddung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`  
`node_modules`: 이 worktree 내부에서 `../arin-design-v3/node_modules` 심볼릭 링크(설치·lockfile 변경 없음).

1. `node node_modules/vitest/vitest.mjs run src/components/library/LessonPractice.test.tsx` → **9 passed**
2. `node node_modules/typescript/bin/tsc -b --pretty false` → **exit 0**
3. `node node_modules/oxlint/bin/oxlint src/components/library` → **exit 0**

미실행: 전체 회귀, 실제 브라우저 QA(모바일·키보드·긴 글 전수), 공개 배포.

## 4. 계약·의존성·미해결

- 공통 타입/DB/API/CSS/콘텐츠/lockfile 미변경. 별도 저장 서비스·과거 PR 합치지 않음.
- 백업·복원/초기화의 DB v4 확장·전체 버전 테스트 기대값 변경은 **총괄 인수 범위**.
- push / PR / 배포 / 외부 메시지 / 전역 설정 / 추가 설치 없음.
- 사용자의 실제 브라우저 DB를 테스트로 초기화하거나 가짜 답안을 기록하지 않음(테스트는 fake-indexeddb).

## 5. 총괄 인수 검토 · 2026-09-11

Cursor 제출 `00a900a63ae9d2847e353c87904a27b058e039d1`을 `3722f76`로 반입했다. 허용한 세 파일 외 변경 없음. 위 1–4절은 Cursor 제출 시점의 보고이며 아래가 통합 결과다.

- 현재 문항 목록이 비어도 저장된 questionSnapshots는 이어서 풀 수 있게 보완했다. 빈 목록 검사는 새 학습 안내에만 적용하고 회귀 테스트를 추가했다.
- 이전 단원에서 늦게 끝난 요청이 새 단원의 잠금을 해제하지 않게 generation 검사를 잠금 해제에도 적용했다.
- 두 실제 창의 충돌 QA에서 Dexie가 덧붙인 `DataError:`가 사용자 문구에 노출되는 것을 발견했다. 충돌 안내를 고정된 사용자 문장으로 바꾸고 회귀 검사와 실제 창 검증을 통과했다.
- 총괄의 DB/백업 v4 변경과 통합했다. 전체 **216 tests / 44 files**, 타입·lint·빌드 통과. Cursor 단독 9개 통과를 전체 품질 승인으로 사용하지 않았다.
- 320/375/768/1280px, 키보드 선택·제출, 선택/해설/문항/결과 재개와 다중 창 충돌을 별도 테스트 origin에서 확인했다. 200% 글자 확대·실제 기기 전수 검증은 미실행.

기존 PR #14의 공통 recordAnswer 경로와 현재 LessonPractice를 확장했다. #1/#2/#6/#12의 별도 세션 저장소를 중복 합치지 않았다. [통합 증거와 제한](../p1-library-validation.md)을 따른다. main 병합·공개 배포는 하지 않았다.
