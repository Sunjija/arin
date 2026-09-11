# Cursor A · P0-03 오늘 학습 다중 창 충돌 재현과 수정 설계

사용자가 이번 턴에 Cursor 작업 배정을 명시적으로 요청했다. 이 문서는 실제 배정 지시다. 기준 소스 `df300ba5bd2cbfb0e2c137bff29536a67f3677bd`, 브랜치 `cursor/p0-session-conflict-audit`, 전용 worktree에서만 작업한다. 다른 Cursor는 ProgressPage와 읽기 전용 집계를 수정 중이다.

## 범위와 산출물

**이번 배정은 재현·수정 설계 단계다. 공통 저장 API 구현은 총괄이 계약을 검토한 뒤 별도 후속 지시한다.**

허용 파일은 `src/lib/studySessionConcurrency.repro.test.ts`와 `docs/reviews/p0-session-conflict-audit.md` 두 개다. 앱 코드·공통 타입·DB·기존 테스트·전체 지침을 수정하지 않는다. 재현 테스트와 보고서의 수정 제안은 실제 코드를 읽고 작성한다. 별도 저장 서비스나 상태 테이블을 만들지 않는다.

읽기 순서: AGENTS.md, docs/development-roadmap.md, docs/parallel-redesign/README.md, contracts.md, ownership.md, e-foundation-api.md, library-practice-api.md, review-context-api.md, docs/cursor-tasks/README.md, briefs/E-learning-foundation.md. 현재 허용 경로와 이 지시의 한정 범위가 역할표보다 구체적인 배정이다.

현재 원격 #14 `c088090`, #12 `8f378a7`, #6 `c2a1c71`과 통합 기준은 기존 docs/pr-integration-review.md를 참고한다. #12 별도 DailyLearningService/StorageAdapter를 추가하지 않고 현재 Dexie/learningApi/studyService를 확장할 방향으로 설계한다. #6의 같은 attempt 원인 갱신은 보존해야 한다. PR을 자동 반입하지 않는다.

## 재현할 위험

1. `saveSession`이 동일 세션의 오래된 선택·메모·문항 인덱스로 최신 진행을 덮는 경우. 두 UI를 흉내 낸 독립 사본으로 순서를 제어한다.
2. 이전 회차 사본이 새 회차 시작 후 저장/완료될 때 새 activeSession을 덮거나 이전 세션을 재생성하는 경우.
3. QuizStep의 `recordQuizAnswer` 성공 뒤 `onChange/saveSession` 실패: attempts·오답·숙련도와 feedback 진행이 분리되는지. 동일 attempt 재시도에서 기존 정오·스냅샷·원인을 보존하는지도 확인한다.
4. `rateCard` 성공 뒤 단계 저장 실패, 중복 클릭이나 두 창 처리에서 간격/횟수가 중복 반영되는지.
5. `completeSession/finishSession` 재시도, 오래된 세션의 완료, `startOrResumeSession` 정규화가 저장된 최신 상태를 되돌리는지.

최소 3개의 가장 중요한 실패를 실제 fake-indexeddb와 현재 API로 재현하고 나머지는 근거와 함께 판정한다. 네트워크·시간 sleep에 의존하지 말고 호출 순서/제어 가능한 DB 실패를 사용한다. 기대 결과는 '기록 손실 없이 충돌 거절 또는 같은 저장 결과 반환'이다. 현재 결함을 입증하는 테스트는 `it.fails`로 명시할 수 있으나 보고서에는 **알려진 결함이 재현되어 테스트 러너가 성공한 것이며 수정 완료가 아님**을 적는다. 결함이 없는 경우 억지로 실패를 만들지 않는다. 기능 구현을 mock으로 대체해 증거를 꾸미지 않는다.

## 수정 설계의 필수 조건

보고서에 정확한 코드 위치, 재현 순서, 실제 DB 전후 상태, 영향, 우선순위를 작성한다. 제안할 API의 이름·입력·반환·호출자 변경을 표로 정리하되 아직 구현된 소비 계약으로 선언하지 않는다.

- 세션 ID와 revision의 비교·갱신, 구형 revision 없는 기록의 이전, 오래된 회차 처리.
- 선택/제출/다음/원인/카드 평가/완료별 트랜잭션 경계와 필요한 테이블. 같은 제출 재시도와 다른 내용의 오래된 요청을 구분한다.
- questionContexts·질문/개념 스냅샷과 기존 답안·카드·완료 이력 보존. 날짜 변경도 미완료 세션 재개 우선.
- 충돌/저장 실패 시 UI가 해설·다음·결과를 새로 공개하지 않고 '저장된 진행 다시 불러오기'로 복구하는 경로.
- 기존 자료실 revision 구현의 재사용 가능 부분·개선할 차이. 백업 v1~v4 호환성과 검증 위치, DB 버전 변경 필요 여부.
- API 기반 → UI 소비 → 백업/회귀 → 실제 두 창 QA 순서의 구현 작업 파일 목록. ProgressPage는 다른 작업 소유이므로 수정 대상으로 할당하지 않는다.

## 실행과 제출

Node는 실행 프롬프트에 전달된 절대경로를 사용한다. 설치된 node_modules 공유 symlink만 허용하며 설치·잠금파일 변경은 하지 않는다. `node node_modules/vitest/vitest.mjs run src/lib/studySessionConcurrency.repro.test.ts`, 타입 검사, 해당 파일 lint를 실행해 명령/결과를 적는다. 전체 회귀나 브라우저 QA를 실행하지 않았으면 명시한다. 실제 사용자 브라우저 DB는 열거나 초기화하지 않는다.

허용 두 파일만 로컬 커밋하고 기준/제출 SHA·수용 기준별 증거·미해결 사항을 보고한다. push·PR·병합·배포·Sites 도구·다른 에이전트·외부 메시지·계정/전역 설정 변경은 하지 않는다. 막힌 권한은 우회하지 말고 어떤 명령과 이유인지 보고한다. CLI 로그·토큰·개인 경로는 저장소에 넣지 않는다.
