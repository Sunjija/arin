# P2 · 신라 성장·제도 3개념 (t-tk-04~06) 콘텐츠 배치

> **최종본은 8절을 기준으로 한다.** 1–7절은 Cursor 제출 초안 기록이다. 총괄이 q-111·113·114·115·116의 과제/선지/해설을 편집했고 가이드 버전도 4로 올렸다. 초안의 과제 차별·완료 표기를 최종 인수 판정으로 읽지 않는다.


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


## 8. 총괄 독립 검토·최종 통합 (2026-09-13)

제품 기준 `50d796e`, 배정 지시 `9b37e1a`. 최신 원격 제품 브랜치는 `fad1c5c` 그대로였고 열린 PR #8/#11/#14 등을 확인했다. 별도 Cursor CLI worktree에서 제출한 `80c08a4`와 제출 기록 `770f384`를 총괄 `codex/release-quality-80`에 `c12b208` / `71ea77f`로 반입했다. 전면 PR 병합은 하지 않았다. Cursor 실행은 종료했다. 원격 push·PR·배포 없음.

### 콘텐츠 편집

| ID | 초안의 문제 / 최종 판단 | 최종 과제 |
|---|---|---|
| q-111 | 법흥·진흥 짝짓기가 기존 왕별 업적 확인과 겹치고 폐지·천도 오답이 비현실적 | 한강 유역 확보의 경제·교류상 결과 판단. `tk-silla-hanriver-consequences`, cause-effect |
| q-112 | 순수비·적성비의 성격 비교라는 별도 목적에 적합 | 재구성 텍스트를 이용한 비석 성격 구분 유지. 실물 이미지 식별이나 지도 문항으로 집계하지 않음 |
| q-113 | 정답만 긴 설명문이었음 | 동일한 관등명·등수 형식으로 6두품의 아찬 상한 확인. 5두품·4두품 상한도 오답 해설에서 구분 |
| q-114 | q-113과 중위제·아찬 제한을 반복 | 가옥 규정과 관등 제한을 읽고 혈통 중심 신분제의 정치·생활 영향을 해석. `tk-silla-golpum-life-interpretation` |
| q-115 | ‘오늘날 총리와 완전히 같음’, ‘순수비 부서’ 같은 쉽게 제거되는 오답 | 공동 수련·인재 천거 자료로 화랑도 식별. 병부·상대등·태학·골품제의 다른 기능 해설. `tk-silla-hwarang-training-identify` |
| q-116 | 정답만 길고 화랑 역할을 q-115와 반복 | 병부·상대등의 설치 왕을 길이가 비슷한 왕 조합으로 구분. 군사 관부와 고위 관직의 성격 명시 |

q-111·113·114·115·116 내용 버전 2, q-112는 1. 가이드 lesson-02/13은 최종 버전 4, source-checked(AI). 기존 q-01~110 원문과 기존 가이드 section은 보존했다. 새 설명에서 상대등을 관부로 묶었던 표현을 고위 관직으로 고치고, 화랑(지도자)과 화랑도의 조직·활동을 구분했다. 골품제 회상 질문에 생활 제한을 포함하여 예상 답과 일치시켰고, 관등 숫자가 작을수록 높음을 설명했다. 진흥왕 설명에는 한강의 경제·교류상 이점을 보완했다.

### 실제 독립 출처 대조

Codex가 본문을 열어 대조했다. 아래 근거의 집필자 해석을 공식 출제 기준으로 표시하지 않는다.

- [진흥왕의 영토 확장](https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0020_0030_0020): 한강 상·하류 확보 과정, 경제력과 황해를 통한 교류. q-111 및 가이드 보완 근거.
- [진흥왕 순수비](https://contents.history.go.kr/front/tg/view.do?levelId=tg_001_0230), [단양 신라 적성비](https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_r100340): 순행 기념과 공훈 포상·지역민에 대한 조치의 성격 차이. 비석 이미지는 사용하지 않았다.
- [17관등](https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_001_0400&pageUnit=10&treeId=0209), [6두품세력의 성장](https://contents.history.go.kr/front/nh/print.do?levelId=nh_011_0020_0040_0030&whereStr=): 아찬·대아찬, 5두품 대나마/4두품 대사, 중위제의 범위.
- [신라의 골품제](https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_018_0060): 신분별 가옥·장식 등 생활 규정. 특정 사료의 번역문을 복사하지 않고 학습용 설명으로 재구성했다.
- [신라의 화랑도](https://contents.history.go.kr/id/hm_021_0020), [화랑도 용어 해설](https://contents.history.go.kr/mobile/tg/view.do?ganada=&levelId=tg_001_0960&pageUnit=10&subjectCode=tg_ty_090&tabId=02): 공동 수련·인재 천거와 국가적 인재 양성. 조직을 현대 관청/정규 군단과 같게 쓰지 않는다.
- [상대등](https://contents.history.go.kr/mobile/tg/view.do?ganada=&levelId=tg_001_0720&pageUnit=10&subjectCode=tg_ty_090&tabId=02), [법흥왕의 체제 정비](https://contents.history.go.kr/id/hm_011_0040): 관직과 관부의 구분, 병부·상대등 설치 왕.

각 오답이 왜 해당하지 않는지 총괄 AI가 읽고 편집했다. 문자열 앞부분이 해설에 포함되는 자동 테스트를 역사적 정오 검증으로 사용하지 않는다. 해당 형식 강제 테스트는 제거했고 구조·매핑·재구성·배치별 과제 검사는 유지했다. 사람 전문가 승인, 전 기출 유사도 검사, 공식 회차/번호 매칭, 실측 정답률·변별도·학습 효과는 미실시다. 이번 문항은 개념 확인·기초 적용용이며 실전 승인 문항으로 표시하지 않는다.

### 자료실 연결과 기록 보호

`f9c7ae9`에서 다음을 구현했다.

- `src/lib/libraryQuestionBank.ts`: 초안이 아닌 가이드의 실제 설명·출처가 있는 개념에 전부 연결되고 문항 출처가 있는 질문만 새 자료실 연습 대상으로 삼는다. 구조적 준비 조건이며 전문가 승인 조건은 아니다.
- `src/lib/libraryPractice.ts`: 새 시작/다시 풀기에서 같은 필터를 사용한다. 이미 저장된 세션은 최신 필터로 재구성하지 않고 기존 스냅샷을 그대로 재개한다. DB/백업 버전 변경·삭제·reseed 없음.
- `src/components/library/ConceptExplorer.tsx`: lesson-01에만 있던 풀이 UI를 단원별로 제공한다. 준비 문항이 없으면 준비 중 안내. 준비 가이드가 사라진 단원도 저장된 진행은 읽을 수 있다.
- `src/components/library/LessonPractice.tsx`: 준비된 문항 개수와 안내를 공통 선정 결과로 표시. 화면 검토에서 발견한 자료 줄바꿈 소실을 수정하여 재구성 표시와 (가)/(나) 자료가 나뉘어 보이게 했다.
- `libraryQuestionBank.test.ts` 및 `LessonPractice.test.tsx`: 미준비 개념·출처 누락·초안 제외, 기존 미매핑 q-04/q-53 제외, 단원 이동 시 선택 복원, 가이드가 초안으로 바뀐 뒤에도 저장 세션·백업 보존, 미준비 안내를 검증했다. 기존 저장 실패/중복 제출/충돌 회귀도 유지한다.

일일 학습에서는 첫 11개 완료 뒤 t-tk-04/05/06과 q-111~116이 선택되고 버전·순서가 백업/이어 풀기에서 유지되는 실제 IndexedDB 회귀를 추가했다. 기존 3개 배치의 회귀도 보존했다. `earlyStates`, `threeKingdomsBatch`, `conceptSchedule`, `learningApi.pacing`, `progressSummary`, `ProgressPage`는 새 데이터의 14/74 및 차단 t-tk-08에 맞춰 갱신했다.

### 최종 검증과 범위

- 전체 Vitest **63파일 / 298개 통과**. 이후 자료 줄바꿈 UI 수정 후 해당 12개 테스트와 빌드 재통과.
- TypeScript 검사 통과, lint 0, 프로덕션 빌드 통과. 초기 JS 575.95 kB / gzip 178.08 kB, 기존 500 kB 청크 경고 남음.
- Node 감사 회귀 8개 통과. coverage 생성/재검사 통과, 구조 오류 0 / 기존 검토 경고 94.
- 설명+명시 연결 확인 문항 준비 **14/88개**, 미준비 74, 다음 공백 `t-tk-08`. 전체 116문항, 명시 개념 연결·출처 URL 22, 별도 계열 2개 이상 개념 10. 생산량·계열 개수는 실전 품질 또는 학습 효과 지표가 아니다.
- 준비된 자료실 문항: lesson-01 10, lesson-02 8, lesson-13 4. 이전 문항을 삭제한 것은 아니며 신규 자료실 선정 범위만 제한한다.
- 실제 Chrome 로컬 preview에서 375×812 문항을 읽고 키보드 Enter로 선택, 새로고침 후 같은 문제·선택 재개, 오답 채점·해설 확인. 1440×1000에서 비석 비교 지문과 줄바꿈을 확인했다. 두 너비에서 가로 넘침 없음. 4문항을 마치고 의도한 3/4 결과 확인. 스크린샷은 `output/playwright/p2-silla-question-mobile.png`, `p2-silla-question-desktop.png`(로컬, Git 제외).
- 실제 Android/iOS 기기, 모든 신규 문항의 전 UI 조합, 사람 전문가 검수는 미실시. 전체 제품 출시 80% 달성으로 해석하지 않는다.

다음은 현재 편집 순서의 삼국 불교·문화(t-tk-08)와 종합 왕 비교(t-tk-09)다. 기존 왕별 문제를 문장만 바꿔 늘리지 말고 문화재별 사실·출처·이미지 권리를 먼저 확인한다. 목적/검수 메타의 공통 스키마와 실전/연습 분리, 콘텐츠 로딩 분리는 별도 우선 과제로 남긴다.
