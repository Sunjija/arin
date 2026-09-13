# P2 · 신라 성장·제도 3개념 (t-tk-04~06) 콘텐츠 배치

기준 SHA(작업 시작): `9b37e1a` (제품 `50d796e` 이후 지시 포함 통합 HEAD)  
작업 브랜치: `cursor/content-silla-02`  
확인일: 2026-09-13  
검수 상태: **출처 대조(source-checked, AI)** — 전문가 시험 승인(approved) 아님  
실제 대조 수행: Composer(AI coding agent). 사람·전문가 승인 표시 없음.  
유사도 검사·이용 허락·사람 승인·실측 난이도: **미실시** (완료로 쓰지 않음).

허용 변경: `src/data/lessonGuides.ts`, `src/data/questions.ts`, `src/data/sillaBatch.test.ts`, `research/content-coverage/*`, 본 보고서.

앞선 삼국 배치의 총괄 편집 7절([p2-three-kingdoms-content.md](p2-three-kingdoms-content.md#7-총괄-ai-독립-검토통합-2026-09-13))을 참고했다. 과제 차별·선지 정오 단서 분산·재구성 표시·지도 없는 map-region 금지를 반영했다.

## 1. 범위

- 완료: 설명 3개 + 확인 문항 6개(q-111~q-116).
  - t-tk-04 / lesson-13: 진흥왕 한강·순수비, 법흥 구분, 적성비≠순수비
  - t-tk-05 / lesson-02: 골품·진골·6두품, 아찬 상한·중위제 주의, 왕위 자격 시기 차이
  - t-tk-06 / lesson-02: 화랑(수련·인재) vs 병부·상대등(법흥 설치), 총리 동일시·정규 군부대 금지
- 비범위: 기존 q-01~110 본문·ID·정답·버전, lesson-01 전체, lesson-02/13 기존 section 원문, API/DB/화면/공유 타입, 집계 기대값 11→14·77→74·차단 `t-tk-08`(총괄), 자료실 진입, push·PR·배포.
- PR #8/#11: 전체 병합하지 않음.

가이드: lesson-01 `contentVersion` 5 유지. lesson-02·lesson-13 기존 section 유지 + 신규 section, `contentVersion` 2→3, `reviewStatus=source-checked`(approved 금지).

## 2. 출처 대조 로그 (URL 존재 ≠ 확인)

| URL | 실제 열람·대조한 주장 | 결과 |
|---|---|---|
| https://contents.history.go.kr/mobile/mid/kc_n101750 | 진흥왕 재위·한강 상류(551)·하류(553) 확보, 순수 정의, 순수비 4점(창녕·북한산·마운령·황초령), 법흥과의 선후 | 확인 |
| https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0020_0030_0020 | 한강 확보·대가야·함흥 진출, 단양 적성비와 4개 순수비를 함께 열거하되 별개로 제시 | 확인 |
| https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_001_0230&pageUnit=10&treeId=0206 | 순수·순수비 정의, 확인된 순수비 4점 | 확인 |
| https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_r100340 | 단양 적성비: 야이차 공훈 표창·충성 권고, 순수비와 다른 선무/척경 성격 | 확인 |
| https://contents.history.go.kr/id/hm_011_0040 | 법흥왕 병부(517)·상대등(531) 설치, 상대등을 고려 재상에 비긴 찬자 주석·해석 여지 | 확인 |
| https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101130 | 병부·상대등 설치 연대·기능, 법흥 체제 정비 | 확인 |
| https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_001_0400&pageUnit=10&treeId=0209 | 17관등·진골(1~5)·6두품(아찬=6등 상한) | 확인 |
| https://contents.history.go.kr/front/nh/view.do?levelId=nh_011_0020_0040_0010 | 골품: 관등·혼인·가옥·의복·우마차 제한, 성골 소멸 후 계층 변화 | 확인 |
| https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_011_0020_0040_0030 | 6두품 아찬 상한, 중위제(중아찬~4중아찬)가 아찬 범주를 넘지 않음 | 확인 |
| https://contents.history.go.kr/id/hm_018_0030 | 아찬=6두품 상한, 중위제 특진 설명 | 확인 |
| https://contents.history.go.kr/id/hm_021_0020 | 화랑: 도의·산수·천거, 교육·인재·예비 군사적 면, 정규 관청으로 단정하지 않음. 설치 연 해석 여지 | 확인 |
| https://contents.history.go.kr/mobile/mid/kc_n101750 (화랑 절) | 화랑도 인재 양성·원화 뒤 화랑 | 확인 |

### 가이드 주장 ↔ 근거

| 학습 문장 요지 | 근거 |
|---|---|
| 진흥: 한강 확보·순수비 | kc_n101750, ta_m71_…_0030_0020 |
| 법흥≠진흥(율령·공인 vs 한강·순수) | hm_011_0040, kc_n101750 |
| 적성비≠순수비 | kc_r100340 vs tg_001_0230 |
| 진골 고위·6두품 아찬 상한 | tg_001_0400 |
| 중위제는 아찬 범주 안 | nh_011_0020_0040_0030, hm_018_0030 |
| 생활 제한·왕위 자격 시기 차이 | nh_011_0020_0040_0010 |
| 병부·상대등=법흥 설치 | hm_011_0040, kc_n101130 |
| 화랑=수련·천거(관청·정규 군부대 아님) | hm_021_0020 |
| 상대등≠현대 총리 동일 | hm_011_0040 재상 비유 + 단정 금지 |

### 의도적으로 넣지 않거나 완화한 것

- 지도 이미지 없이 `map-region` 유형 부여 금지(q-111·112).
- 적성비 건립 연도의 학설 나열, 관산성·대가야 세부 시험화.
- 화랑 설치 연도(576 vs 사다함 사례)를 단정 정답으로 사용하지 않음.
- 중위제를 「사실상 상한 철폐」로 단순화하지 않음.
- 성골·진골 왕위 자격을 전 왕대 동일 규칙으로 서술하지 않음.
- 기출 원문·시험 PDF·미확인 사진 미사용.

## 3. 신규 문항

| ID | familyId | 목적 | 배점 | lessonId | 기존과의 차별 |
|---|---|---|---:|---|---|
| q-111 | tk-silla-jinheung-beopheung-pair | 법흥↔진흥 업적 짝짓기 | 1 | lesson-13 | q-04(왕 식별)·q-07(진위)·q-110(공인 왕 연결)과 다른 비교 과제 |
| q-112 | tk-silla-sunsubi-jeokseongbi | 순수비·적성비 성격 구분 | 2 | lesson-13 | 왕 이름만이 아니라 비석 성격 적용 |
| q-113 | tk-silla-golpum-achan-limit | 6두품 아찬 상한 확인 | 1 | lesson-02 | q-07·q-08의 골품 폐지 오답과 다른 상한 과제 |
| q-114 | tk-silla-golpum-jungwi-trap | 중위제 과장·왕위 동일 서술 오류 탐지 | 2 | lesson-02 | 쉬운 상한 확인과 다른 오류 탐지 |
| q-115 | tk-silla-hwarang-byeongbu-pair | 화랑·병부 기능 짝짓기 | 1 | lesson-02 | 제도명 나열이 아닌 기능 구분 |
| q-116 | tk-silla-institutions-king-function | 병부·상대등 설치 왕 + 화랑 성격 | 2 | lesson-02 | 자료 세 항목을 읽어 설치·성격 동시 판단 |

- 5지선다, `conceptIds`는 가르친 개념만. `difficulty`는 배점 자리(실측 난이도 아님).
- q-112·116 지문에 **학습용 재구성 (원문 인용 아님)** 명시.
- 학습 목적·AI 출처 대조·사람 미검수는 본 문서에만 명시(현재 Question 스키마에 승인 필드 없음).

### 독창성

- 기출 지문·사진·선지 조합 복제 없음(자체 제작).
- 기존 q-04/07/110과 동일 답·단서 복제 회피: 짝짓기·비석 성격·관등 상한·중위제 함정·제도 기능으로 과제 분리.

## 4. 테스트·집계

- 신규 `src/data/sillaBatch.test.ts`: 가이드 v3·기존 section 보존·ID 예약·family·lesson/concept·map-region 금지·재구성 표시·catalog ready.
- **수정하지 않음**(총괄 소유): earlyStates / conceptSchedule / progressSummary / ProgressPage / learningApi.pacing의 11·77·`t-tk-04` 기대값, threeKingdomsBatch의 section 배열 exact match.

`content-coverage.mjs` / `--check`: 개념 설명 **14** / 공백 **74**, 문항 **116**, 명시 연결·출처 URL **22**.

## 5. 사람 검수 한계·미구현 메타 (남아 있음)

- 역사 전문가 승인·기출 평가 능력 대조 미실시.
- 실측 난이도·변별력·학습 효과·유사도 검사 없음.
- AI 출처 대조이며 모든 이설·세부 연도를 소진하지 않음.
- Question 스키마에 제작 목적/사람 승인/유사도/이용 허락 필드 없음 → 본 보고서로만 기록.
- 이번 6문항은 개념 확인·기초 적용용이며 실전 승인 아님.

## 6. 검증 결과

| 명령 | 결과 |
|---|---|
| `vitest run` | **62파일 / 292테스트** — 통과 284, 실패 8 (아래) |
| `tsc -b --pretty false` | 통과 |
| `oxlint src` | 통과 (0) |
| `vite build` | 통과 (초기 청크 약 576 kB / gzip 178 kB, 500 kB 경고 기존) |
| `content-coverage.mjs` / `--check` | 통과. 14 / 74, 문항 116, 명시 연결 22 |

### 정당한 기존 기대값 실패 (약화하지 않음 · 총괄 인수 반영)

실제 UI/스케줄은 준비 **14** / 공백 **74** / 다음 차단 `t-tk-08`로 바뀜. 기존 테스트는 11/77/`t-tk-04` 또는 삼국 section exact를 기대:

- `src/data/earlyStates.test.ts` — unavailable 77 (실측 74), blocked `t-tk-04`(실측 `t-tk-08`)
- `src/data/threeKingdomsBatch.test.ts` — lesson-02 sections `['t-tk-01','t-tk-03']`, lesson-13 `['t-tk-02']` exact (신규 section 추가됨)
- `src/lib/conceptSchedule.test.ts` — unavailable 77
- `src/lib/learningApi.pacing.test.ts` — readyIds에 t-tk-04~06 미포함
- `src/lib/progressSummary.test.ts` — readyRemaining 10 / unavailable 77, 경고 문구 77개
- `src/pages/ProgressPage.test.tsx` — 「준비됨 11개 · 준비 중 77개」

신규 `sillaBatch.test.ts` 4개 전부 통과.

## 7. 제출 SHA

로컬 커밋: `80c08a492f75674144168fcda27fb10cb5144f12`  
브랜치: `cursor/content-silla-02`  
push·PR·배포: 없음. 자동 생성 `artifacts/question-inspection-report.*`는 미커밋.
