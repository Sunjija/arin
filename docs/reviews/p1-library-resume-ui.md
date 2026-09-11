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
