# Cursor B · P1-05 학습 기록 화면의 진도와 풀이 이력

사용자가 이번 턴에 Cursor 작업 배정을 명시적으로 요청했다. 실제 코드 수정 작업이다. 기준 소스 `df300ba5bd2cbfb0e2c137bff29536a67f3677bd`, 브랜치 `cursor/p1-progress-records`, 전용 worktree만 사용한다. Cursor A는 저장 충돌을 재현·설계하며 공통 저장 계약을 수정하지 않는다.

## 허용 범위

`src/pages/ProgressPage.tsx`, `src/pages/ProgressPage.test.tsx`, `src/lib/progressSummary.ts`, `src/lib/progressSummary.test.ts`, `docs/reviews/p1-progress-records.md`만 수정한다. 새 두 파일의 progressSummary는 이 화면용 순수 읽기 집계이며 공통 API/저장소가 아니다. shared types/DB/learningApi/studyService/practiceTrend/questionStudyContext/CSS/콘텐츠/다른 페이지/의존성/잠금파일 변경은 금지한다. 필요한 범위 밖 수정은 보고서의 후속 의존성으로 적는다.

AGENTS.md, docs/development-roadmap.md, docs/parallel-redesign/README.md, contracts.md, ownership.md, e-foundation-api.md, review-context-api.md, briefs/B-home-progress-settings.md, docs/cursor-tasks/README.md를 읽는다. #2/#12는 기존 pr-integration-review.md의 선택을 따른다. 별도 DailyLearningService/StorageAdapter나 미확정 타입을 도입하지 않는다.

## 총괄이 확정한 읽기 계약

기존 `getProgressSnapshot`·연습 추이·실전 점수 집계를 보존한다. 목표/진도는 `getGoal()` (`src/lib/learningApi.ts`), `catalogConcepts()` (`src/lib/conceptCatalog.ts`), `db.conceptProgress.toArray()`, `buildConceptSchedule({today, goal, concepts, progress})` (`src/lib/conceptSchedule.ts`)를 읽기 조합으로 소비한다. 활성 기록은 `db.activeSession.toCollection().first()`로 읽는다. `computeStudyPlan`이나 save/start/complete/seed 함수를 기록 화면 조회에서 호출하지 않는다.

1. **목표 대비 개념 진도:** 실제 완료 개념 / 전체 목록 개념, 남은 개념, 설명 준비 중 개념을 구분한다. `learnState=completed`만 완료다. viewed/learning/구형 단원 완료를 새 개념 완료로 추정하지 않는다. 목표일·시험일은 구분하고 시험일 미정/지남, 쉬는 날, 준비된 상세 설명이 막히는 상황은 기존 스케줄 값과 경고를 사용한다. 88개 전체가 준비되어 있다고 표현하지 않는다. '완주 가능/불가능'이나 새로운 예상 시간·합격 확률을 만들지 않는다.
2. **저장된 완료 학습의 풀이 구분:** `activeSession.step === result`일 때만 `sessionExposureStats(activeSession)`와 저장 날짜로 첫 풀이/다시 풀이/구분 정보 없음의 정답·문항 수를 보여준다. 미완료면 결과를 만들지 않고 진행 중임을 설명하거나 이 결과 영역을 비운다. 구형 context 없음은 미확인. 0문항은 기록 없음. 카드만 복습한 완료도 빈 문항 상태를 정확히 표시한다.
3. 이 결과는 **현재 저장된 완료 학습 1회**의 결과다. 전체 역사/최근 7·30일 통계인 것처럼 표시하지 않는다. 기간 토글은 기존 연습 정답률에만 적용됨을 UI에서 명확히 한다. 소실된 과거 세션 context를 현재 attempts로 역산하지 않는다. 첫 풀이가 처음 본 자료·실전 미노출 평가를 뜻하지 않는 기존 기준을 짧게 설명한다.
4. **근거 없는 문구 개선:** 기존 weakAreas는 시대·문항 유형 집계이므로 '개념'이라고 단정하지 않고 실제 범위를 이름 붙인다. 데이터가 없거나 적은 상태의 '현재 보완할 영역 없음'을 숙달 완료로 오해하지 않도록 기록의 한계를 표시한다. 임의 최소 표본이나 새 추천 점수를 만들지 않는다.

## UI와 오류

현재 디자인·Pretendard·기존 컴포넌트와 CSS 클래스를 사용한다. 이번 작업은 전면 재디자인이 아니다. 제목·횟수·목표 날짜가 320px와 긴 문구에서 줄바꿈되게 하고 키보드 접근·기존 기간 토글·실전/자료실 링크를 보존한다. 불필요한 장식 이미지나 아이콘 시스템을 만들지 않는다.

읽기 실패 시 완료된 것처럼 보이지 않게 사용자용 안내와 재시도를 제공한다. 재시도는 기록 조회만 하며, unmount·뒤늦은 응답이 최신 화면을 덮지 않도록 처리한다. 내부 예외/ID/영문 enum을 노출하지 않는다. 과거 `getProgressSnapshot`과 현재 화면의 사용되지 않는 의미를 임의로 바꾸지 않는다.

## 검증과 제출

실제 pure helpers + fake-indexeddb로 핵심을 검증한다: 빈 기록, 완료/열람/학습 중의 구분과 목록 밖 ID, 시험일 미정/과거, 미준비 설명, 완료 세션 first/repeated/unknown 및 중복 답안 방어, 미완료/카드만 완료, 구형 context 없음, 기간 토글의 적용 범위, 읽기 실패/재시도, 화면 조회 전후 DB 불변. 핵심 저장을 mock으로 대체하지 않는다. 테스트를 수량 채우기용으로 복제하지 않는다.

실행 프롬프트에 전달된 Node와 공유 node_modules로 관련 tests, tsc, 해당 경로 lint를 실행한다. 기존 전체 검사는 239개/49파일이며 제출 시 새 테스트 수·실패를 정확히 기록한다. 실사용 브라우저 DB에 테스트 답안을 넣거나 초기화하지 않는다. 실제 브라우저 320/375/768px·200% 확대는 미실행이면 명시하고 총괄 검수로 남긴다.

허용 5파일만 로컬 커밋하고 기준/제출 SHA, 변경 파일, 수용 기준별 증거, 읽기 전용 계약 유지, 잔여 제한을 보고서와 최종 응답에 적는다. push·PR·병합·배포·Sites 도구·추가 에이전트·외부 메시지·계정/전역 설정 변경은 하지 않는다. 권한 차단을 우회하지 말고 해당 명령/이유를 보고한다. 토큰·CLI 로그·개인 경로는 저장소에 넣지 않는다.
