# P0-04 하위 · 선사·고조선 개념·확인 문항 보강

기준 SHA: `ae444905b0464d5a6c50a64bba7c32bfbc78cf8d`  
작업 브랜치: `cursor/p0-first-lesson-content`  
확인일: 2026-09-11  
검수 상태: **출처 대조(source-checked)** — 전문가 시험 승인(expert-approved) 아님

허용 변경: `src/data/lessonGuides.ts`, `src/data/questions.ts`, 본 보고서.

## 1. 가이드 출처 확인 (7개 개념)

| conceptId | 제목 | 1차 출처 URL | 접근 | 비고 |
|---|---|---|---|---|
| t-pre-01 | 구석기·신석기 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0020_0010 | 확인 | 뗀석기·이동 / 빗살무늬·움집·농경·정착 |
| t-pre-02 | 청동기·군장 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0030 | 확인 | 고인돌·노동력·지배층. 추가: `…0030_0010`(민무늬·생활도구 돌·나무) |
| t-pre-07 | 철기 용도 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0020_0010 | 확인 | 농기구·무기·공구, 초기에는 청동기 병용 |
| t-pre-03 | 단군 전승 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0010 | 확인 | 건국 전승·농경 배경. 위만과 구분 강화 |
| t-pre-04 | 위만~멸망 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020 | 확인 | 기원전 194 집권 → 중계무역 → 기원전 108 멸망 |
| t-pre-05 | 8조법 | https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0030 | 확인 | 3조항만 전함, 생명·재산 중시 |
| t-pre-08 | 시대 연결 | 위 위만 페이지 + 신석기·고인돌·8조법 URL | 확인 | 종합 연결. 신규 개념 ID 없음 |

가이드 `contentVersion` 1→2, `reviewStatus`는 `source-checked` 유지. 도입문에 출처 대조와 전문가 승인 구분을 명시.

### 미확인·한계
- 비파형 동검의 전용 서술 페이지는 이번 확인에서 고인돌·청동기 시작·8조법 페이지의 관련 서술을 교차했고, 별도 levelId 전용 본문은 추가 미확인으로 남김.
- 골품제(신라)는 고조선 부정형 오답용으로 사용. 신라 골품제 본문 URL은 이번 범위에서 재확인하지 않음(일반 시대 구분).
- 실측 난이도·변별력·학습 효과는 미검증.

## 2. 기존 문항 변경 (q-01 / 02 / 03 / 51 / 79 / 84)

공통: ID·정답 의미 보존, `contentVersion` 2→3, 오답 포함 5선지를 **선지 문구**로 해설(번호 비의존).

| ID | 변경 요지 | 근거 |
|---|---|---|
| q-01 | 선지별 해설 보강. 사실 수정 없음 | 신석기 페이지: 빗살무늬·움집·농경 |
| q-02 | **도입 시간 관계 수정**. 구: 「한의 요동군과 대립·교류 → 뒤 위만」이 위만(194) 이전·이후 순서를 흐리게 함. 신: 위만 집권 → 중계무역·한 대립 → 8조법은 이 국가 법으로 전승. 정답 「고조선」 유지 | 위만·성장 페이지 |
| q-03 | 선지별 정오 근거 보강. 「빗살무늬=옳지 않음」 유지 | 청동기=민무늬, 신석기=빗살무늬 |
| q-51 | 선지별 해설. 「골품제」만 오류, 한 침략 멸망 유지 | 8조법·위만 페이지 + 신라 제도 구분 |
| q-79 | 선지별 해설. 정답 「위만」 유지 | 위만 페이지 |
| q-84 | 선지별 해설. 정답 「청동기」 유지 | 고인돌·청동기 페이지 |

## 3. 신규 기초 문항

| ID | conceptIds | familyId | 목적 |
|---|---|---|---|
| q-101 | t-pre-07 | pre-iron-use | 자체 출토 목록 해석 → 철기 용도(농기구·무기·공구). 완전 교체 오해 배제 |
| q-102 | t-pre-08 | pre-era-sequence | (나)신석기 → (다)청동기 → (가)위만 고조선 순서 연결 |

- 공식 기출 문장·이미지 없음. 기초 확인용이며 실전 기출 동등 난이도 주장 없음.
- q-101 `sourceUrl`: 철기 보급 페이지. q-102 `sourceUrl`: 신석기 페이지(순서 (나) 근거); (다)·(가)는 고인돌·위만 URL로 교차 확인.

## 4. 품질 검증

실행 환경:
- Node: `/Users/daddung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` (v24.19.0)
- `node_modules`: `../arin/node_modules` 심볼릭 링크(이 worktree 내부, gitignore). npm install 없음.

### 실행 결과

1. `node node_modules/vitest/vitest.mjs run src/data/inspectQuestions.test.ts`
   - 검수 error findings: **0건** (정답 유일성·단원 연결 등 BANK error 없음)
   - 실패 1건: `answerPositionCounts` 기대 `[20,20,20,20,20]` vs 실제 `[21,21,20,20,20]` (문항 102개로 balance 결과). 테스트 파일은 허용 범위 밖 → 총괄 인수.
   - 나머지 2 tests passed.

2. `node node_modules/typescript/bin/tsc -b --pretty false`
   - 실패: `fake-indexeddb/auto` 모듈을 심볼릭 링크된 pnpm `node_modules`에서 해석하지 못함 (테스트 파일 10곳). **본 작업 변경 파일과 무관**한 환경/의존성 해석 이슈.
   - 콘텐츠 데이터 자체에 대한 별도 타입 오류는 위 출력에 나타나지 않음.

### 총괄 인수 항목
1. 문항 수 100→102. `inspectQuestions.test.ts`의 `answerPositionCounts` 고정 기대값 `[20,20,20,20,20]` 갱신 필요(실제 `[21,21,20,20,20]`). 허용 파일 밖이라 미수정.
2. `docs/content-coverage.md`·`scripts/automation/content-coverage.mjs` 집계(문항 수·개념 연결 수) 재생성.
3. DB seed/`CONTENT_VERSION` 범프 정책은 E/총괄 판단(문항 contentVersion만 올림).
4. t-pre-06(여러 나라) 설명·문항은 본 작업 범위 밖.
5. 이 worktree의 `tsc -b`가 심볼릭 링크 `node_modules`에서 `fake-indexeddb`를 못 찾는 환경 이슈 확인(총괄 worktree 자체 `tsc`와 대조).

## 5. 계약·PR
- 공통 타입·API·화면·CSS 미변경. 타입 필드 추가 없음.
- PR #14 원본 재반입·main 병합 없음.
- push / PR / 배포 없음.

## 6. 총괄 인수 후 수정 (같은 날)

Cursor 제출 `7cdcfa26`을 통합 브랜치에 `0a60ad8`로 반입한 뒤 검수했다.

- q-101은 가상 출토 목록임을 지문에 명시했다. 실제 발굴 사실이나 공식 기출 자료로 해석하지 않는다.
- q-102는 누락된 `(다) → (가) → (나)` 오답 해설을 추가하고, 단순한 “청동기 → 고조선” 대신 “신석기 생활 → 청동기 문화 발달 → 위만 집권”으로 구분했다. 고조선 성립 자체를 청동기 이후로 오해하지 않도록 설명했다.
- q-102의 실제 선행 지식인 t-pre-01/02/04를 t-pre-08과 함께 연결했다. 이 두 새 문항 contentVersion은 인수 후 2다.
- 가이드의 청동기 회상 질문에서 묻지 않은 유물 이름을 필수 답변 요소로 요구하지 않도록 수정했다. 개발 검수 상태 설명은 학습 본문의 도입에서 빼고 이 문서에 남겼다. 가이드 contentVersion은 3이다.
- 우리역사넷 구석기·신석기, 철기 보급, 고조선 성장 페이지를 다시 열어 연대·도구 용도·위만/멸망 순서를 확인했다. 비파형 동검 근거는 고조선 성장 페이지의 도움글에도 있어 청동기 설명 추가 출처로 연결했다.
- 총괄 worktree에서 전체 195개 회귀, TypeScript, lint, production build를 통과했다. [최종 검증 기록](../p0-validation.md)을 따른다.

이미지 문항·실측 변별력은 여전히 0이다. q-101은 기초 확인용이며 오답의 난이도·변별력 개선은 후속 편집 과제다. 이 인수는 전문가 시험 승인이나 전 범위 품질 승인과 다르다.
