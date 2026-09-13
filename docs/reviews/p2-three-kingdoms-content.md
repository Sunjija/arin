# P2 · 삼국 초기 3개념 (t-tk-01~03) 콘텐츠 배치

기준 SHA(작업 시작): `1f78429807dd4f2a1ee596c645137b4de4b6b97d` (e1329c9 이후 통합 HEAD)  
작업 브랜치: `cursor/content-three-kingdoms-01`  
확인일: 2026-09-13  
검수 상태: **출처 대조(source-checked, AI)** — 전문가 시험 승인(approved) 아님  
실제 대조 수행: Composer(AI coding agent). 사람·전문가 승인 표시 없음.  
유사도 검사·이용 허락·사람 승인: **미실시** (완료로 쓰지 않음).

허용 변경: `src/data/lessonGuides.ts`, `src/data/questions.ts`, `src/data/threeKingdomsBatch.test.ts`, `research/content-coverage/*`, 본 보고서.

## 1. 범위

- 완료: 설명 3개 + 확인 문항 6개(q-105~q-110).
  - t-tk-01 / lesson-02
  - t-tk-02 / lesson-13
  - t-tk-03 / lesson-02
- 비범위: 기존 q-01~104·10문항 벤치마크 수정, lesson-01 본문/버전 변경, API/DB/세션/UI/CSS, 기존 테스트의 준비 수 8→11·공백 80→77 갱신(총괄 인수), lesson-02↔13 교차 가이드 런타임, push·PR·배포.
- PR #8/#11: 전체 병합하지 않음. 자료 블록·검수 메타는 참고만.

가이드: lesson-01 `contentVersion` 5 유지. lesson-02·lesson-13 신규 `contentVersion=1`, `reviewStatus=source-checked`(approved 금지).

## 2. 출처 대조 로그 (URL 존재 ≠ 확인)

| URL | 실제 열람·대조한 주장 | 결과 |
|---|---|---|
| https://contents.history.go.kr/id/hm_009_0030 | 소수림왕 2년 전진 순도·불상·경전, 태학, 3년 율령 반포, 5년 초문사·이불란사. 체제 정비 목적 해설 | 확인 |
| https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101200 | 소수림왕 재위·불교 장려·태학(대학)·373 율령, 광개토왕 전성기 초석 서술 | 확인 |
| https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_009_0040 | 광개토왕 비문 기반 영역 확장(패려 토벌, 백제 58성 700촌 등) | 확인 |
| https://contents.history.go.kr/id/hm_009_0050 | 장수왕 15년(427) 평양 천도, 개로왕 21년(475) 한성 함락, 백제 웅진 천도 연결 | 확인 |
| https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0020_0010_0020 | 장수왕 평양 천도·남진, 475 한강 유역 확보(교과서형) | 확인 |
| https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0010_0020_0020 | 근초고왕 전성기, 「남으로는 마한 전 지역을 확보」 교과서 표현 | 확인 |
| https://contents.history.go.kr/front/nh/print.do?levelId=nh_006_0020_0020_0040 | 근초고왕 「마한 잔여세력」 통합, 「마한통합은 불완전한 것」·지방관 파견까지는 미진전 | 확인 |
| https://contents.history.go.kr/front/nh/view.do?levelId=nh_006_0030_0020 | 475 한성 함락 후 문주왕 웅진(공주) 천도 | 확인 |
| https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101190 | 성왕 538 사비 천도·남부여, 체제 정비 | 확인 |
| https://contents.history.go.kr/id/hm_011_0040 | 법흥왕 율령 반포·공복(주·자), 병부·상대등·건원 등 체제 정비 | 확인 |
| https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101130 | 법흥왕 율령, 이차돈 순교를 계기로 한 불교 공인, 진흥왕과 구분되는 위치 | 확인 |
| https://contents.history.go.kr/mobile/km/view.do?levelId=km_011_0020_0010 | 527년경 이차돈 순교를 계기로 불교 공인(개설) | 확인 |

### 가이드 주장 ↔ 근거

| 학습 문장 요지 | 근거 |
|---|---|
| 소수림: 불교 수용·태학·율령 | hm_009_0030, kc_n101200 |
| 광개토: 영토 확대(정복) | hm_009_0040 |
| 장수: 427 평양 천도·남진·475 한성 | hm_009_0050, ta_m71_…_0010_0020 |
| 근초고: 전성기·마한 남은 세력 아우름(완전 일괄 통합 단정 회피) | ta_m71_…_0020_0020 vs nh_006_0020_0020_0040 |
| 문주: 한성 함락 → 웅진 | nh_006_0030_0020, hm_009_0050 |
| 성왕: 사비·남부여 | kc_n101190 |
| 법흥: 율령·공복, 이차돈·불교 공인 | hm_011_0040, kc_n101130, km_011_0020_0010 |

### t-tk-02 근초고·마한 편집 판단

- 공식 교과서형(ta_m71): 「마한 전 지역을 확보」.
- 상세 통사(nh_006): 「마한 잔여세력」, 「통합은 불완전」, 일원적 지방관 파견까지는 미진.
- 학습 문장: 「마한의 남은 세력을 아우르며」+「한 시점에 완전히 끝났다」단정 금지. q-108 오답에 과도 단정 문장을 배치해 혼동을 점검.

### 의도적으로 넣지 않거나 완화한 것

- 요서·산둥 진출, 관산성 전투 세부, 금관가야 항복 연월의 시험식 나열.
- 불교 공인 연도를 527/528/535 중 하나로 단정(개설은 이차돈 계기로만 서술).
- 기출 원문·시험 PDF·미확인 사진 미사용.

## 3. 신규 문항

| ID | familyId | 목적 | 배점 | lessonId | 기존과의 차별 |
|---|---|---|---:|---|---|
| q-105 | tk-goguryeo-sosurim-reform | 태학·율령·불교 → 소수림 변별 | 1 | lesson-02 | q-05 순서형·q-53 평양 천도와 다른 과제 |
| q-106 | tk-goguryeo-king-wrong-match | 광개토↔장수 업적 교차 오류 찾기 | 2 | lesson-02 | 순서 배열이 아닌 잘못된 연결 탐지 |
| q-107 | tk-baekje-ungjin-trigger | 한성 함락 → 문주·웅진 | 1 | lesson-13 | q-50 「어느 나라」와 다른 왕·지명 짝 |
| q-108 | tk-baekje-sabi-identify | 사비·남부여 → 성왕, 마한 과도 단정 배제 | 2 | lesson-13 | q-06 근초고 전성기 문항과 다른 천도 식별 |
| q-109 | tk-silla-ichadon-beopheung | 이차돈 순교 단서 → 법흥 | 1 | lesson-02 | q-07 진위형과 다른 인물·사건 식별 |
| q-110 | tk-silla-beopheung-linked-reform | 공인 왕 ↔ 율령·공복 연결, 진흥 혼동 | 2 | lesson-02 | 이차돈→체제 정비 연결(한강·순수 오답) |

- 5지선다, `conceptIds`는 가르친 개념만. `difficulty`는 배점 자리(실측 난이도 아님).
- q-107·108·109 지문에 **학습용 재구성 (원문 인용 아님)** 명시.
- 학습 목적·AI 출처 대조·사람 미검수는 본 문서에만 명시(현재 Question 스키마에 승인 필드 없음).

## 4. 테스트·집계

- 신규 `src/data/threeKingdomsBatch.test.ts`: 가이드·ID 예약·family·lesson/concept 매핑·기존 벤치와 다른 과제·catalog ready.
- **수정하지 않음**: `earlyStates.test.ts` 등 준비 8/공백 80/`blockedConceptId=t-tk-01` 기대값. 인수 시 총괄이 11/77·다음 차단으로 갱신.
- `research/content-coverage/inventory.json`, `report.md`: `node scripts/automation/content-coverage.mjs`로 재생성.

## 5. 사람 검수 한계 (남아 있음)

- 역사 전문가 승인·기출 평가 능력 대조 미실시.
- 실측 난이도·변별력·학습 효과·유사도 검사 없음.
- AI 출처 대조이며 모든 이설·세부 연도를 소진하지 않음.
- lesson-02→13→02 교차 가이드 런타임은 총괄 소유(미검증).

## 6. 검증 결과

| 명령 | 결과 |
|---|---|
| `vitest run` | **60파일 / 286테스트** — 통과 280, 실패 6 (아래 정당한 기대값 어긋남) |
| `tsc -b --pretty false` | 통과 |
| `oxlint src` | 통과 (0) |
| `vite build` | 통과 |
| `content-coverage.mjs` / `--check` | 통과. 개념 설명 11 / 공백 77, 문항 110, 명시 연결·출처 URL 16 |
| `node --test …audit…readiness…` | 8통과 |
| `audit.mjs` | 구조 오류 0 / 사람 검토 경고 94 (기존) |

### 정당한 기존 기대값 실패 (약화하지 않음 · 총괄 인수 반영)

실제 UI/스케줄은 준비 **11** / 공백 **77** / 다음 차단 `t-tk-04`로 바뀜. 기존 테스트는 8/80/`t-tk-01`을 기대:

- `src/data/earlyStates.test.ts` — unavailable 80, ready 8, blocked `t-tk-01`
- `src/lib/conceptSchedule.test.ts` — unavailable 80
- `src/lib/learningApi.pacing.test.ts` — readyIds에 t-tk-01~03 미포함
- `src/lib/progressSummary.test.ts` — readyRemaining 7 / unavailable 80, 경고 문구 80개
- `src/pages/ProgressPage.test.tsx` — 「준비됨 8개 · 준비 중 80개」

신규 `threeKingdomsBatch.test.ts` 5개 전부 통과.
