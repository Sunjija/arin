# Cursor 실제 전달 지시 · 복습 이유·풀이 이력 UI

2026-09-11 실행한 지시의 보관본. 환경의 개인 머신 절대경로만 치환했다. 기준 `afe60756ddb64fda1ee3613dce9915af4763ee47`, 제출 `c4feb4ea4f06deea2bf1b1c52ffd87f4078f2215`, 인수 `db8823f`. 추가 실행 지시가 아니다.

한사코치 P1-03: 문제 선정 이유·반복/첫 풀이 기록 UI. 실제 배정한 독립 하위 작업이다. 기준 afe6075, 별도 cursor/p1-review-context worktree만 수정한다. 총괄은 다른 worktree에서 백업 검증과 회귀를 진행 중이다.
읽기: AGENTS.md, docs/development-roadmap.md, docs/parallel-redesign/README.md, contracts.md, ownership.md, e-foundation-api.md, briefs/C-study-review.md, review-context-api.md, docs/cursor-tasks/README.md. review-context-api.md가 구현된 소비 계약이다. 별도 저장소/타입/DB를 만들지 않는다.

허용 파일: src/components/study/QuizStep.tsx, src/components/study/ResultStep.tsx, src/components/study/QuizStep.test.tsx, src/components/study/ResultStep.test.tsx, docs/reviews/p1-review-context-ui.md. 다른 파일·CSS·공통 타입·DB·서비스·콘텐츠·의존성·lockfile·생성 리포트 변경 금지. 다른 에이전트·push·PR·배포·외부 메시지·계정/전역설정 변경 금지.

구현:
1. QuizStep에서 questionContextCopy(session.questionContexts?.find(...))를 사용해 reasonLabel, historyLabel, reasonDetail을 간결하게 표시한다. 정답 공개 전 문제와 제출 후 해설에서 동일 정보가 유지되어야 한다. historyDetail은 '풀이 이력 기준' details로 펼쳐 읽게 해서 본문을 압도하지 않는다. 배점은 유지하고 개발 ID·배열·영문 reason을 노출하지 않는다.
2. ResultStep에서 sessionExposureStats(session)의 first/repeated/unknown 그룹별 correct/total을 보여준다. daily와 review 모두 동일하게 사용할 것. 0개 그룹은 기록 없음으로 표시하고 0%를 만들어 넣지 않는다. 첫 풀이 기록은 '학습 시작 전 동일 문항 답안 없음' 기준이며 처음 본 자료·미노출 실전 평가·숙련도라고 주장하지 않는다. 기존 카드 수·합산 결과·이동 버튼 유지.
3. 구형 세션(questionContexts 없음)은 미확인으로 표시한다. UI에서 현재 DB를 읽어 첫 풀이를 추정하거나 저장된 context를 수정하지 않는다. 선택/제출/원인 건너뛰기/같은 attempt 갱신/저장 실패/다음 버튼 흐름은 보존한다. 새로운 글로 인해 320px에서 넘치지 않게 기존 스타일·Pretendard와 의미 있는 HTML 사용.
4. 실제 API/순수 표시 함수 연결 회귀 테스트. 최소: due vs recent vs supplementary 표시, 첫 풀이/반복/유사 계열/구형 미확인, 제출 전 해설 숨김 및 제출 후 같은 이유 유지, 문항 변경과 remount, 결과 그룹 분리·중복 답안 방어·0분모, 링크 유지. 저장을 테스트하려면 fake-indexeddb로 실제 서비스를 사용한다. 표시 테스트에서만 fixture 사용 가능. UI 구현 전체를 mock으로 대체하지 말 것.

환경: node_modules가 없으면 <총괄-worktree>/node_modules를 가리키는 이 worktree 내부 symlink 허용. Node 실행파일은 <확인한-Node-실행파일>. 설치 없이 Node로 node_modules/vitest/vitest.mjs run src/components/study/QuizStep.test.tsx src/components/study/ResultStep.test.tsx, node_modules/typescript/bin/tsc -b --pretty false, node_modules/oxlint/bin/oxlint src/components/study 를 실행한다. 실사용 브라우저 DB 초기화·테스트 답안 입력 금지.

완료하면 허용 파일만 로컬 커밋한다. 기준/제출 SHA, 변경 파일, 수용 기준별 증거, 실제 명령/실패, 미실행 QA, push/배포 여부를 보고서 및 최종 응답에 기록한다. 범위 밖 의존성은 보고만 한다.
