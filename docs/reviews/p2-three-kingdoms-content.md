# P2 · 삼국 초기 3개념 (t-tk-01~03) 콘텐츠 배치

> **총괄 통합·편집 결과는 7절을 기준으로 한다.** 아래 1–6절은 Cursor 제출 `ee426e4`의 기록이다. 특히 q-108의 평가 과제·familyId, 가이드/문항 버전과 테스트 결과는 통합 과정에서 변경했다. 제출 초안과 최종본을 혼동하지 않는다.


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


## 7. 총괄 AI 독립 검토·통합 (2026-09-13)

기준 `1f78429`에서 Cursor CLI를 별도 worktree로 실제 실행했다. 제출 `ee426e4`의 허용 6파일을 검토하고 `15140e1`로 반입했다. 총괄 브랜치는 `codex/release-quality-80`이다. 기존 q-01~104와 lesson-01의 본문/버전은 보존했다. push·PR·배포는 하지 않았다.

### 최종 편집

| 문항 | 초안에서 발견한 점 | 최종 변경 / 확인 |
|---|---|---|
| q-105 | 재구성 정책 요약이 원문처럼 보일 여지 | 재구성 표시 추가. 불교·태학·율령으로 소수림왕 식별, 쉬운 개념 확인 목적 유지 |
| q-106 | 여러 선지가 평양 천도·한성 함락을 중복 진술해 서로 정오 단서를 줌 | 태학·천도·한성·율령·정복으로 진술 분산. 광개토왕의 평양 천도만 틀리고 장수왕과 혼동하는 이유 해설 |
| q-107 | 서로 다른 나라의 억지 조합, 성왕·사비라는 참인 짝까지 모두 틀렸다고 한 해설 | 백제 왕·도읍 조합으로 오답 통일. 성왕·사비는 참인 짝이지만 자료의 475년 사건에 해당하지 않는다고 설명 |
| q-108 | 지문의 사비 천도를 정답에서 그대로 반복; ‘하루아침에 완전 통합’이라는 쉽게 제거되는 오답 | 한성→웅진 / 웅진→사비 비교 자료를 읽고 국난 수습과 중흥 배경을 구분. `tk-baekje-capital-move-context` 계열로 변경 |
| q-109 | ‘불교가 공인된 왕’이라는 어색한 질문 | 사건 당시 신라 왕을 묻도록 교정. 이차돈 전승 요약의 재구성 표시 유지 |
| q-110 | 공인 왕을 식별한 뒤 다른 체제 정비를 연결하는 학습 과제로 적합 | 내용 유지. 법흥·진흥·장수·성왕·소수림의 혼동을 각각 해설 |

q-105~109 최종 `contentVersion=2`, q-110은 1. 신규 두 가이드는 `contentVersion=2`. 가이드의 제작자용 ‘선수 지식’ 서술을 학습자에게 자연스러운 연결 문장으로 바꾸고, 소수림왕의 세 제도가 하는 역할을 보완했다. 근초고왕 설명은 남쪽 세력 확대와 직접 지배 제도의 완성을 구분해 짧게 정리했다. 상세 마한 해석 논의는 학습 문단에서 줄이고 출처 기록에 남겼다.

### 독립 출처 대조

Codex가 2026-09-13 실제 페이지를 열어 확인한 범위:

- [소수림왕의 체제 정비](https://contents.history.go.kr/id/hm_009_0030): 불교 수용·태학·율령 및 각 제도의 목적.
- [광개토왕의 영역확장](https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_009_0040), [평양 천도와 남진](https://contents.history.go.kr/id/hm_009_0050): 두 왕의 활동 구분, 427 천도·475 한성 함락.
- [근초고왕의 영토 확장](https://contents.history.go.kr/id/hm_010_0020), [정복전쟁과 마한통합](https://contents.history.go.kr/front/nh/print.do?levelId=nh_006_0020_0020_0040): 대외 활동과 마한 세력 통합의 범위·직접 지배에 관한 해석. 가이드 대표 링크를 근초고왕 사료·해설 페이지로 바꿨다. 옛 교과서의 요서·산둥 진출 설명은 채택하지 않았다.
- [웅진천도와 중흥](https://contents.history.go.kr/front/nh/view.do?levelId=nh_006_0030_0020), [성왕](https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101190): 문주왕의 국난 수습과 성왕의 538 사비 천도·남부여·중흥을 구분.
- [법흥왕의 체제 정비](https://contents.history.go.kr/id/hm_011_0040), [법흥왕](https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101130), [교과서의 삼국 정치 발전](https://contents.history.go.kr/front/ta/print.do?levelId=ta_h51_0040_0020_0010&whereStr=): 법흥왕의 율령·공복·이차돈과 진흥왕의 영토 확장·순수비를 대조. 불교 공인의 특정 연도는 이번 평가 대상으로 삼지 않았다.

기관에 수록된 집필자의 해석을 기관의 공식 출제 기준으로 표시하지 않았다. 이 검토는 AI 편집이며 사람 전문가 승인, 전 기출 유사도 검사, 실제 정답률·변별도 검증은 미실시다. 원문 번역·문제지 이미지나 문화재 사진을 복제하지 않았다. 이번 6문항은 개념 확인·기초 적용용이고 기출과 같은 배점·평가 능력으로 정식 매칭/승인한 실전 문항은 아니다. 약 49%의 과거 주관 평가를 이번 생산량으로 재계산하지 않는다.

### 기능·검증

- `learningApi.ts` / `learningGuideOrder.test.ts`: lesson-02 → lesson-13 → lesson-02가 lesson-02 묶음으로 합쳐져 순서가 뒤집히던 결함을 먼저 실패 테스트로 재현했다. 인접한 설명만 묶도록 수정(`3463976`). 생성 시의 개념 순서·가이드·복원 스냅샷을 유지한다.
- `learningApi.pacing.test.ts`: 첫 8개를 학습한 사용자의 다음 3개가 삼국 개념이고 신규 6문항이 선택됨을 실제 IndexedDB 테스트로 확인. 기존 배운 범위의 복습 문항도 함께 유지한다. 백업 복원·다음날 재개와 내용 버전 보존을 검증했다.
- `earlyStates`, `conceptSchedule`, `progressSummary`, `ProgressPage` 테스트: 11개 준비/77개 미준비, 다음 차단 `t-tk-04`의 실제 데이터로 기대값 갱신. 미준비 내용을 건너뛰지 않는 검사는 유지한다.
- 최종 Vitest 전체 **61파일/288개 통과**. 실제 삼국 선택·버전·백업 테스트 포함. 타입 검사 통과, lint 0, 프로덕션 빌드 통과.
- Node 구조 검사 테스트 8개 통과. coverage 생성/재검사 통과. 콘텐츠 감사 구조 오류 0 / 기존 검토 경고 94. 초기 JS 청크 561.41 kB(압축 173.79 kB)로 500 kB 경고는 남아 있다.
- 최종 재고: 88개 목록 중 설명+명시 연결 확인 문항 11개, 미준비 77개; 전체 110문항 중 명시 개념 연결·출처 URL 16개; 서로 다른 계열 2개 이상을 가진 개념 7개. 계열 개수는 실측 독립성이나 충분한 복습 재고를 의미하지 않는다.
- 로컬 프로덕션 preview에서 375×812 자료실의 백제 설명을 직접 화면으로 확인했다. 백제·고구려/신라 단원 모두 가로 넘침 없음(문서 너비 375), 브라우저 콘솔 오류·경고 0. screenshot: `output/playwright/p2-baekje-mobile.png`(로컬, Git 제외). 모든 기기·키보드·신규 문항의 전체 UI 흐름을 확인한 것은 아니다.

### 다음 작업 순서

1. 현재 공백 `t-tk-04` 진흥왕 → `t-tk-05` 골품제 → `t-tk-06` 화랑·중앙 정비를 같은 기준으로 제작. 생산량보다 과제 차별·사실·설명을 먼저 검수.
2. 자료실의 단원 문제 풀이 진입은 현재 lesson-01만 노출한다. 신규 문항은 일일 학습에서 제공된다. 자료실 확대 시 준비된 개념/문항만 선택하는 기준과 기존 자료실 세션 보존을 먼저 구현·검증할 것.
3. 목적·승인 주체를 문서뿐 아니라 공통 콘텐츠 스키마와 노출 게이트로 관리. 이번 학습용 문항이 실전 승인으로 자동 간주되지 않도록 실전/연습 분리를 보완.
4. 사람 역사 검수, 공식 최근 기출 분석의 확인 범위 확장, 이후 독립 변형 문항과 실제 첫 풀이/반복 풀이 데이터 수집. 2문항만으로 장기간 반복 효과를 주장하지 않는다.
5. 초기 콘텐츠 로딩 분리, 실제 Android/iOS 기기 저장·재개 검증. 전체 제품 80% 완료와 이 배치의 구조적 준비 수치는 별개다.
