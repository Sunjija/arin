# P2 콘텐츠 배치: 삼국 초기 3개 개념

실제 배정: Cursor CLI. 출발 제품: e1329c9 이후 이 지시가 포함된 통합 HEAD. 로컬 브랜치 cursor/content-three-kingdoms-01. 총괄은 codex/release-quality-80에서 검토한다.

AGENTS.md의 읽기 순서와 docs/content-production-standard.md, agents/question-inspector.md, G brief를 읽고 실제 구현한다. 기존 원격 PR #8/#11은 아직 별도이며 전체 병합하지 않는다.

범위:

- t-tk-01 고구려 전성기 왕 / lesson-02: 소수림왕의 체제 정비→광개토왕의 영토 확대→장수왕의 평양 천도/남진을 구분. 왕별 사실·시기를 출처로 확인.
- t-tk-02 백제 전성·천도 / lesson-13: 근초고왕, 한성 함락/문주왕의 웅진 천도, 성왕의 사비 천도를 구분. 마한 전체를 한 시점에 완전히 통합했다고 단정하는 서술 주의.
- t-tk-03 신라 불교 공인 / lesson-02: 법흥왕의 율령/불교 공인·이차돈, 진흥왕과의 혼동 해소. 실제 확인한 범위만 설명.

설명 3개, 확인 문제 6개(각 개념 2개). 새 ID q-105~q-110만 예약. 기존 q-01~104와 기존 10문항 벤치마크는 수정하지 않는다. 기존과 동일 정답·단서를 되풀이하는 문제를 피하고 실제 다른 평가 과제로 작성한다. 각 문항 conceptIds는 이번 실제 가르친 개념에만 명시적으로 연결하고 정확한 lessonId를 지킨다. 유형은 실제 자료와 일치해야 한다. 필요하면 1점 확인+2/3점 적용을 쓰되 모든 3점에 같은 추론 단계를 강제하지 않는다.

현재 Question 스키마를 사용하고 목적/AI 검수/사람 미검수는 검토 문서에 명시. guide source-checked는 실제 출처 내용을 대조한 경우에만 사용, approved 금지. 자료는 원문 복제가 아닌 학습용 재구성이며 표시할 것. 기록하지 않은 유사도 검사·이용 허락·사람 승인을 완료로 쓰지 않는다.

허용 파일:

- src/data/lessonGuides.ts (기존 선사 본문/버전 그대로, lesson-02와 lesson-13 guide 추가)
- src/data/questions.ts (q-105~110 추가만; 스키마/기존 정답 재배치 함수 수정 금지)
- src/data/threeKingdomsBatch.test.ts (의미 있는 데이터/중복/매핑 검증)
- research/content-coverage/inventory.json, report.md (스크립트로 재생성)
- docs/reviews/p2-three-kingdoms-content.md (주장별 실제 확인 URL·편집 판단·목적/배점/계열·테스트·남은 미검증 범위)

다른 코드나 기존 테스트를 수정하지 않는다. 기존 테스트의 준비 수 8→11 / 공백 80→77 / 차단 지점 변경은 총괄이 인수 때 반영한다. API/DB/세션/스냅샷/UI/CSS/패키지/설정 변경 금지. 특히 lesson-02→13→02로 교차하는 가이드 순서의 런타임 처리는 총괄 소유다.

Cursor는 실제 출처를 열고 대조한 기록을 제출한다. 검색 결과 제목이나 URL만 보고 검증 완료로 쓰지 않는다. t-tk-02의 근초고왕 범위는 공식 교과서와 상세 역사 서술의 차이를 확인해 표현을 결정한다. 출처 미확보 부분은 미확인으로 보고하고 대량의 임시 지식으로 채우지 않는다.

전체 테스트/타입/lint/build와 콘텐츠 집계를 실행. 정당한 기존 데이터 기대값 실패는 그대로 보고하고 테스트를 약화하지 않는다. Windows Node/Powershell, npm은 node ..\npm-runtime\package\bin\npm-cli.js, node_modules는 총괄이 연결한다. vitest.cmd/tsc.cmd/oxlint.cmd/vite.cmd는 node_modules/.bin에 있다.

허용 파일만 로컬 커밋하고 SHA, 출처·변경 내용, 테스트 결과를 제출한다. 다른 worktree 변경, push/PR/배포/설정 변경/추가 위임을 하지 않는다.
