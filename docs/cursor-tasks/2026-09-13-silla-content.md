# P2 다음 콘텐츠 묶음: 신라의 성장과 제도

실제 담당 Cursor CLI. 출발 제품 50d796e 이후 이 지시가 포함된 통합 HEAD. AGENTS.md 읽기 순서, docs/content-production-standard.md, agents/question-inspector.md, docs/parallel-redesign/briefs/G-content-quality.md와 앞선 삼국 보고서의 총괄 편집 7절을 확인한다.

다음 3개 개념의 설명과 확인 문제 6개를 실제 구현한다.

- t-tk-04 / lesson-13: 진흥왕의 한강 확보·순수비, 법흥왕과 구분. 적성비와 순수비의 성격을 혼동하지 않기. 지도 없이 map-region으로 집계하지 않기.
- t-tk-05 / lesson-02: 골품에 따른 관등 진출·생활 제한, 진골·6두품 비교. 6두품의 관등 상한(아찬)과 중위제 등을 단순화해 잘못 단정하지 않기. 모든 왕대의 왕위 자격을 동일하게 설명하지 않기.
- t-tk-06 / lesson-02: 화랑의 수련·인재 양성과 병부·상대등의 기능 및 설치 왕을 구분. 화랑을 정규 군부대나 국가 관청으로 쓰지 않기. 상대등을 오늘날 총리와 동일시하지 않기. 실제 대조한 범위만 설명.

신규 ID q-111~116 예약, 각 개념 2문항. 기존 q-01~110 본문·ID·정답·버전 유지. 기존 lesson-01 전체와 lesson-02/13 기존 section 원문 유지, 새로운 section을 추가하고 해당 guide 내용 버전 2→3으로 올린다. 두 문항은 다른 평가 과제여야 하며, 기존 문항의 답과 단서를 복제하지 않는다. 쉬운 개념 확인과 비교/자료 적용을 목적에 맞게 구성. 모든 오답 해설을 쓰되 선지 전문을 무조건 반복하여 문량을 늘리지 않는다. 의미 있는 자료만 붙이고 재구성 표시를 명시한다. 정답이 길거나 다른 선지가 정오를 알려 주는 문제, 쉽게 제거되는 황당한 오답을 피한다.

실제 공식 기관 페이지를 열어 주장별 대조와 URL을 보고. 출처 제목만 확인한 것은 미검증. AI 대조와 사람 검수는 구분하며 approved, 실측 난이도, 유사도 검사, 이용 허락 완료를 허위 기록하지 않는다. 이번 목적은 개념 확인·기초 적용이며 실전 승인 아님. 원문/시험지/사진 배포 금지. 현재 스키마 그대로 사용, 미구현 관리 메타는 보고서로 남김.

허용 파일만 수정:
- src/data/lessonGuides.ts
- src/data/questions.ts
- src/data/sillaBatch.test.ts (신규, 실제 매핑/정답/자료 점검)
- research/content-coverage/inventory.json, report.md (스크립트 재생성)
- docs/reviews/p2-silla-content.md (제출·출처·독창성·미검수·명령 결과)

총괄 소유: API/DB/화면/공유 타입/기존 테스트·집계 기대값(11→14, 77→74, 다음 차단 t-tk-08). 다른 코드/설정/잠금파일/다른 worktree 수정 금지. PR #8/#11은 별도이며 전체 병합하지 않는다. 총괄은 준비된 문항의 자료실 진입도 별도 구현하므로 중복 작업하지 않는다.

검증: node node_modules/vitest/vitest.mjs run, node node_modules/typescript/bin/tsc -b --pretty false, node node_modules/oxlint/bin/oxlint src, node node_modules/vite/bin/vite.js build, node scripts/automation/content-coverage.mjs 및 --check. 이전 배치 수에 고정된 테스트 실패는 그대로 보고하며 임의로 약화하거나 수정하지 않는다. node_modules는 총괄이 연결한다. 필요한 조사 도구만 사용하고 자격 증명을 출력하지 않는다.

허용 파일만 로컬 커밋하고 SHA/수용 기준별 증거/실패를 보고한다. 자동 생성된 artifacts/question-inspection-report.*는 허용 범위 밖이므로 커밋하지 않는다. push/PR/배포/추가 위임 금지.
