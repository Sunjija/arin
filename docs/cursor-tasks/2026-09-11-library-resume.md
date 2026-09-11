# Cursor 실제 전달 지시 · 자료실 재개 UI

2026-09-11 실행한 지시의 보관본. 아래 환경의 개인 머신 절대경로만 치환했다. 제출 `00a900a`, 인수 `3722f76`. 추가 실행 지시가 아니다.

한사코치 P1-04: 자료실 확인 문제의 중단·이어하기 UI. 총괄이 실제 배정한 독립 작업이다.
현재 별도 cursor/p1-library-resume worktree만 수정. 기준 0b56a6d(기록 API 6개 테스트 및 타입 통과). 총괄은 다른 worktree에서 DB/백업 v4 호환·추가 회귀를 수정 중이다.

읽기: AGENTS.md, docs/parallel-redesign/contracts.md, ownership.md, briefs/F-library-timeline.md, library-practice-api.md, e-foundation-api.md, docs/cursor-tasks/README.md. library-practice-api.md는 구현된 소비 계약이다. 과거 PR/별도 저장서비스를 합치지 않는다.

허용 파일은 src/components/library/LessonPractice.tsx, src/components/library/LessonPractice.test.tsx, docs/reviews/p1-library-resume-ui.md 세 개뿐이다. 다른 파일/타입/DB/API/CSS/콘텐츠/lockfile/생성 리포트는 변경하지 말고 의존성으로 보고. 다른 에이전트·push·PR·배포·외부 메시지·전역 설정·추가 설치 금지.

목표:
- 최초 열기는 문제 시작 안내. 저장된 진행이 있으면 getLibraryPractice로 불러와 question/feedback/result 단계, 선택, 점수, 순서를 자동 복원. 문항/해설은 반드시 questionSnapshots만 렌더링. 기존 빈 단원 처리 유지.
- 시작/startLibraryPractice, 선택/selectLibraryChoice, 제출/submitLibraryAnswer, 다음/advanceLibraryPractice, 완료 뒤 다시 풀기/restartLibraryPractice를 연결한다. 답안 API recordAnswer를 UI에서 별도로 호출하지 않는다.
- API 성공 후 반환 상태를 적용한다. 클릭 잠금으로 이중 제출 방지. 오류시 이전 단계·선택 유지, 설명/결과를 새로 공개하지 않는다. 저장 실패와 초기 로딩 오류에 재시도/저장된 진행 다시 불러오기 제공. 여러 창 충돌은 자동 덮어쓰지 않는다.
- lessonId prop 변경, 컴포넌트 해제 후 지연 응답이 다른 단원으로 새지 않게 하라. 반환된 revision을 다음 요청에 사용한다.
- 기존 디자인/Pretendard/키보드 접근/긴 지문 유지. 저장 상태와 이어하기 설명은 사용자에게 이해되는 문장으로. 개발 용어/내부 ID를 화면에 노출하지 않는다. 개인 학습 완료/숙련/실전 점수로 과장하지 않는다.
- 완료 후 다시 풀기는 새 세션이며 기존 시도 기록은 보존. 사용자의 실제 브라우저 DB를 테스트용으로 초기화하거나 가짜 답안을 기록하지 않는다.

테스트: 기존 단원 한정/저장 실패 테스트를 실제 API로 유지하고 unmount/remount 선택 복원·제출 후 해설 복원 및 중복 시도 없음·다음 단계 저장 실패·결과 복원·명시적 다시 풀기·lessonId 변경·초기 로드 실패/재시도를 포함. mock만으로 구현을 복사하지 말고 fake-indexeddb 실제 저장 증거를 확인한다. 전체 버전 테스트의 DB v4 기대값 변경은 총괄 인수 범위다.

환경: node_modules가 없으면 이 worktree 내부에 <총괄-worktree>/node_modules를 가리키는 symlink를 만들 수 있다. 설치/잠금파일 변경 금지. Node는 <확인한-Node-실행파일>. 해당 Node로 node_modules/vitest/vitest.mjs run src/components/library/LessonPractice.test.tsx, node_modules/typescript/bin/tsc -b --pretty false, node_modules/oxlint/bin/oxlint src/components/library 를 실행하고 실제 통과/실패를 보고.

완료 후 허용 세 파일만 로컬 커밋하고 SHA/변경사항/수용기준별검증/미해결 사항을 보고서와 최종응답으로 제출. 원본 내용/전역 사용자 설정을 바꾸지 않는다.
