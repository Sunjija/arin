# F 소비용 자료실 진행 API

P1-04, 2026-09-11. E/총괄이 구현한 계약이다. UI 담당은 별도 저장소·타입·답안 서비스로 대체하지 않는다.

모듈 `src/lib/libraryPractice.ts`, 타입 `LibraryPracticeSession` (`src/types/index.ts`). 기존 열린 PR의 별도 DailyLearningService/StorageAdapter는 재사용하지 않으며, 현재 Dexie와 `recordAnswer`를 확장한다. 오늘 학습과 공통 답안 이력을 사용하지만 진행 상태는 별도 `libraryPractice` 테이블이다. DB v4는 이 테이블만 추가하며 기존 기록은 유지한다. 백업·복원/초기화 확장은 총괄 인수 범위다.

| 함수 | 입력 | 결과/동작 |
|---|---|---|
| `getLibraryPractice` | lessonId | Promise<세션 또는 undefined>, 읽기 전용. 잘못된 저장 원본은 reject |
| `startLibraryPractice` | lessonId | 기존 진행/완료 결과가 있으면 그대로 반환. 없을 때만 해당 단원의 문항 스냅샷으로 시작 |
| `selectLibraryChoice` | itemKey + selectedIndex | 선택만 저장, 아직 채점/시도 생성 안 함 |
| `submitLibraryAnswer` | itemKey | 저장된 선택 채점, 공통 시도/오답/숙련도/개념 + feedback 상태를 원자 저장 |
| `advanceLibraryPractice` | itemKey | feedback에서 다음 문제 또는 result로 저장. 같은 문항의 중복 이동은 건너뛰지 않음 |
| `restartLibraryPractice` | lessonId + sessionId | result에서만 새 UUID/최신 스냅샷으로 재시작. 이전 시도는 보존 |

`itemKey = { lessonId, sessionId: row.id, questionId: row.questionSnapshots[row.questionIndex].questionId, revision: row.revision }`.

세션에는 `step: question|feedback|result`, `questionIndex`, `selectedIndex`, `questionSnapshots`, `answers`, `revision`, 시작/수정 시각이 있다. 답안 점수는 `answers.filter(a => a.correct).length`로 계산한다. 무작위 runId나 별도의 score 카운터를 화면에서 만들지 않는다.

- 문항/보기/정답/해설은 저장된 `questionSnapshots`로 표시한다. 진행 중 콘텐츠 업데이트로 원본을 교체하지 않는다.
- API가 성공한 뒤 반환 세션으로 UI를 갱신한다. 선택 저장/제출/다음/재시작 모두 busy lock과 오류 표시가 필요하다.
- 초기 로딩과 오류 재조회에서는 `getLibraryPractice`를 사용한다. 저장된 question/feedback/result를 복원하며, 최초 상태에서 사용자가 시작 버튼을 누를 때 `startLibraryPractice`를 호출한다.
- 여러 창의 오래된 선택은 revision 검사로 거절한다. 오류에 `다른 창`이 포함되면 사용자가 **저장된 진행 다시 불러오기**를 할 수 있게 한다. 재조회는 저장된 상태를 표시하는 동작이며 답안을 재제출하지 않는다.
- 서버/저장 오류를 덮어쓰거나 자동 재시작하지 않는다. 저장 실패 시 해설 공개·다음 문제 이동·점수 증가 금지.
- lessonId 변경/컴포넌트 해제 후 늦게 도착한 응답이 다른 단원 화면을 덮지 않게 한다.
- 자료실 풀이 완료는 단원 개념 1회독 완료와 다르다. `activeSession`, 오늘 계획, `lessonCompletions`를 수정하지 않는다.
- UI는 현재 파일럿 공개 범위(lesson-01)와 기존 디자인·Pretendard를 유지한다. 다른 단원의 문제를 추가 공개하지 않는다.
