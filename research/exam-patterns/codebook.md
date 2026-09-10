# 한능검 심화 기출 패턴 분류 코드북

버전: `2026-09-v1`  
적용 범위: 공식 심화 65~79회. 79회 이후 공개분은 이 버전 집계에 섞지 않는다.

이 코드북은 문항 **원문을 복제하지 않고** 시대·능력·형식·자료를 같은 규칙으로 붙이기 위한 내부 기준이다.  
국사편찬위원회가 문항마다 평가 유형을 공개한 것은 확인되지 않았다. 평가 능력 필드는 항상 **「공식 6유형 정의를 참고한 내부 추정」** 이다.

## 1. 상태와 검토 주체

| 상태 | 의미 | 완료로 세지 않는 경우 |
|---|---|---|
| `unreviewed` | 값 없음 또는 아직 손대지 않음 | 기본 |
| `auto` | 정답표·웹 정답·키워드 규칙 등 재실행 가능한 계산 | 원본 대조가 아님 |
| `ai_source_check` | 렌더링/OCR/정답표를 보고 에이전트가 원본 대조 | 사람 검수 아님 |
| `human` | 사람이 원본을 보고 수정·승인 | 이번 파이프라인만으로 부여하지 않음 |

필드별로 상태를 둔다. 배점이 `auto`여도 시대·추론 단계는 `unreviewed`일 수 있다.  
확인되지 않은 값은 `null`로 남긴다. OCR이 깨진 부분을 그럴듯한 사실로 메우지 않는다.

배점(`points`), AI가 느끼는 인지 부담(`ai_cognitive_load`), 실제 정답률(`observed_correct_rate`)은 **다른 필드**다. 공식 통계가 없으면 정답률·변별도를 채우지 않는다.

## 2. 공식 평가 유형 (명칭·정의)

출처: [시험 소개·출제유형](https://www.historyexam.go.kr/pageLink.do?link=examInfo)

| id | 공식 명칭 | 공식 정의 요약 |
|---|---|---|
| `historical_knowledge` | 역사 지식의 이해 | 사실·개념·원리 이해 |
| `chronology` | 연대기의 파악 | 연속·변화·발전, 시대 순과 인과 |
| `situation_issue` | 역사 상황 및 쟁점의 인식 | 자료에서 과제·논점·주장을 포착 |
| `source_analysis` | 역사 자료의 분석 및 해석 | 정보를 해석하고 시대·사회 의미를 파악 |
| `inquiry_design` | 역사 탐구의 설계 및 수행 | 절차와 방법에 따라 탐구를 설계·수행 |
| `conclusion_evaluation` | 결론의 도출 및 평가 | 자료 타당성 판별, 종합해 결론 |

문항별 공식 라벨이 없으면 `official_skill_type_scope = internal_estimate_from_official_definitions`.

경계: 연표 빈칸은 `chronology`. 판결문·신문에서 대상을 식별한 뒤 사실을 고르면 `source_analysis`를 주된 값으로 두고 `situation_issue`는 보조 설명에만 적는다. 탐구 설계(`inquiry_design`)는 탐구 절차 자체가 질문의 핵심일 때만 쓴다.

## 3. 내부 문제 형식

앱 계약 `src/data/examFormats.ts`의 `ExamFormatId`를 재사용한다.

| id | 쓰는 때 | 쓰지 않는 때 |
|---|---|---|
| `source-who` / `source-what` | 자료 → 인물 또는 사건·제도 | 질문 문장에 대상 고유명이 이미 노출 |
| `source-underline` | 밑줄 ㉠의 의미 | 밑줄이 없는 일반 자료형 |
| `chronology-events` | 사건 나열 순서 | (가)(나)(다) 라벨 배열 |
| `chronology-labeled` | (가)~(다) 또는 연표 빈칸 배열 | 단순 인과 한 줄 |
| `king-policy-match` | 왕↔정책 | 두 왕 비교 |
| `king-compare` | 둘 이상의 왕·제도·시기를 비교 | 단일 대상 설명 |
| `policy-name` / `policy-content` | 명칭 vs 내용 | 단체 활동 |
| `wrong-statement` | 옳지 않은 것 | 옳은 것 고르기 |
| `org-activity` | 단체·운동 노선 | 왕 업적 |
| `heritage-period` | 유산 → 시기 | 유산 사진을 보고 명칭만 |
| `map-region` | 공간·지도가 핵심 단서 | 지명이 지문에만 스쳐 지나감 |
| `cause-effect` | 영향·배경·결과 | 단순 사실 확인 |

## 4. 시대

앱 `EraId`와 호환한다.

| id | 포함 | 경계 사례 |
|---|---|---|
| `prehistoric` | 선사, 고조선, 부여·옥저·동예·삼한 | 고구려 성립 이후는 `three-kingdoms` |
| `three-kingdoms` | 고구려·백제·신라·가야 | 문무왕 이후 통일기 제도는 `north-south` |
| `north-south` | 통일신라·발해 | 후삼국 개시는 여기 또는 고려 이양. 주된 대상이 고려 태조면 `goryeo` |
| `goryeo` | 후삼국 수습~조선 건국 직전 | 위화도 회군은 `goryeo` |
| `joseon-early` | 태조~광해 이전을 대략. 임진왜란 이전 제도 정비 | 임진왜란·병자호란·영정조는 `joseon-late` |
| `joseon-late` | 양난 이후~세도·실학·민란 | 강화도조약 이후 개항 정세는 `opening` |
| `opening` | 강화도조약~대한제국·국권 피탈 과정 | 1910년 이후 식민 통치는 `colonial` |
| `colonial` | 무단·문화 통치, 독립운동, 전시 동원 | 1945년 이후 정부 수립 과정은 `modern` |
| `modern` | 해방·정부 수립~현대 정치·경제 | 문화유산만 물으면 아래 |
| `culture` | 주된 질문이 문화유산·사상 작품의 시기 | 정치 사건의 배경 유물은 해당 정치 시대를 primary, culture는 secondary |

`period_block`: `premodern` (선사~조선) / `modern` (개항~현대) / `culture`.  
문화사 문항은 primary를 `culture`로 두고, 왕조가 분명하면 `secondary_eras`에 왕조를 넣는다.

## 5. 자료 종류 (다중)

한 문항이 여러 값을 가질 수 있다. 합이 100%를 넘어도 된다.

| id | 기준 |
|---|---|
| `text_source` | 사료·문헌 인용 |
| `instructional_text` | 신문·안내문·학습 시나리오·대화문 중 설명 목적 |
| `photo` | 유적·유물·인물·건축 사진 |
| `map` | 지도 |
| `timeline` | 연표 |
| `table` | 표 |
| `dialogue` | 말칸·대화 |
| `composite` | 위 유형이 2개 이상 결합되어 풀이에 모두 필요 |
| `none` | 자료 없이 질문 문장만. 최근 심화에서는 드묾 |

`visual_required`: 사진·지도·연표·표의 **배치나 내용**을 봐야 답을 고를 수 있으면 true.  
캡션만으로 충분하고 그림이 장식에 가까우면 false.  
이미지를 확인하지 못했으면 `null` (보류). 키워드만으로 true를 확정하지 않는다.

키워드 자동 분류는 시대·형식 힌트만 채운다. 확정 통계(`ai_source_check` 이상)와 섞어 쓰지 않는다.

## 6. 추론 단계와 오답

- `reasoning_steps` 1: 자료에 대상이 거의 드러나 사실만 고름  
- 2: 자료에서 대상·시기를 식별한 뒤 관련 사실을 고름  
- 3: 두 자료 사이 구간, 비교, 빈칸 연표 등 결합  
- 질문 문장에 정답 대상 고유명이 있으면 `answer_target_exposed_in_stem=true`

오답 구성 `distractor_strategy` 예: `adjacent_period_markers`, `same_era_institutions`, `swapped_roles`, `similar_org_lineage`, `order_permutation`.

## 7. 추적

문항마다 `paper_sha256`, `key_sha256`, 가능하면 `page`, `bbox`를 남긴다.  
파일명 숫자만으로 회차를 정하지 않는다. 정답표·문제지 표지의 `제N회`·`심화`와 게시물 제목을 대조한다.

## 8. 집계 규칙

- 단일 분류(주된 시대): 분모 = 그 필드가 분류된 문항 수. 합 ≈ 100%.  
- 다중 분류(자료 유형): 분모 = 문항 수. 합이 100%를 넘을 수 있다.  
- 미분류는 분모에서 빠기고, 0으로 채우지 않는다.  
- 결과는 ‘공식 출제 비율’이라 부르지 않는다.
