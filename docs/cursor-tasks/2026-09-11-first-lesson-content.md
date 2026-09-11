# Cursor에 전달한 첫 작업 지시

2026-09-11 실행 완료. 과거 실행 기록이며 이 파일을 읽는 것만으로 다시 실행하지 않는다. Node 경로만 환경 독립 표기로 바꾸었다.

```text
한사코치 P0-04 하위 일감: 선사·고조선 개념·확인 문항 보강.
총괄이 명시적으로 배정한 독립 작업입니다. 기준 SHA ae444905b0464d5a6c50a64bba7c32bfbc78cf8d, 현재 별도 worktree와 cursor/p0-first-lesson-content 브랜치만 사용하세요. 총괄은 다른 worktree에서 공통 목표/계획 API를 수정 중입니다.

읽기: AGENTS.md, docs/parallel-redesign/contracts.md, ownership.md, briefs/G-content-quality.md, e-foundation-api.md, docs/pr-integration-review.md, docs/content-coverage.md, agents/question-inspector.md. PR #14 원본을 다시 가져오거나 main을 병합하지 마세요.

허용 수정 파일: src/data/lessonGuides.ts, src/data/questions.ts, docs/reviews/p0-first-lesson-content.md. 공통 타입·DB·API·화면·CSS·다른 콘텐츠·자동 생성 집계·package/lockfile은 수정하지 마세요. 다른 에이전트 실행, 외부 메시지, push/PR/배포/전역 설정/추가 설치는 하지 마세요.

작업:
1. 선사·고조선 7개 guide를 연결된 우리역사넷 등 공공 1차 출처로 확인하고 학습자의 정답 근거가 설명에 충분히 있도록 보완하세요. 출처 확인과 전문가 승인을 구분하세요. expert-approved로 표기하지 마세요.
2. 기존 q-01/02/03/51/79/84의 정답 유일성·시기·용어를 검토하고 특히 q-02 도입부 시간 관계를 명확히 하세요. 기존 ID·정답 의미를 보존하되 잘못된 사실은 근거와 함께 수정하세요. 수정 문항 contentVersion을 증가시키세요.
3. 6개 문항 각각에 오답을 포함한 5개 선택지의 판단 근거를 explanation 문자열에 추가하세요. balanceAnswerPosition이 선지 순서를 바꾸므로 번호에 기대지 말고 선택지의 문구/핵심어로 해설하세요. 타입 추가 금지.
4. 독립 확인 문항이 없는 t-pre-07(철기 용도), t-pre-08(시대/사회 변화 연결)에 각각 1개의 자체 기초 문항을 추가하세요. 사용하지 않은 q-101, q-102 ID를 확인해서 사용하고 conceptIds, familyId, contentVersion, sourceUrl, 기존 필수 메타를 넣으세요. 최소 하나는 간단한 자체 자료를 해석하게 하되 실전 기출과 동등한 난이도라고 주장하지 마세요. 공식 기출 문장을 복제하거나 이미지를 생성하지 마세요.
5. 보고서에는 실제 출처 URL·확인일·문항별 변경 근거·미확인 사항·품질 검증 결과를 작성하세요. 사이트 접근 실패 시 검수 완료라고 하지 말고 미확인으로 남기세요. 새로운 개념 ID를 임의로 만들지 마세요.

검증: 설치된 node_modules가 없으면 npm install 하지 말고 총괄 worktree의 node_modules로 심볼릭 링크(이 worktree 내부만)를 만들어 읽기 전용으로 사용 가능합니다. Node 경로 <설치된 Node 실행 경로>. 관련 검사 node node_modules/vitest/vitest.mjs run src/data/inspectQuestions.test.ts 및 node node_modules/typescript/bin/tsc -b --pretty false. 콘텐츠 수량 변경 때문에 다른 테스트/집계 업데이트가 필요하면 보고서에 총괄 인수 항목으로 남기세요. 허용 파일만 변경하세요.

완료 후 허용 파일만 로컬 커밋하고 최종 답변에 SHA, 변경 요약, 실제 검증/실패, 남은 의존성을 적어 주세요. 작업이 차단되면 이유와 이미 완료한 내용을 먼저 남기세요.
```
