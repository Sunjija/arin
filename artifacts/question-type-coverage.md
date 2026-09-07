# 한능검 심화 문제 유형(포맷) 커버리지 갭

- 생성 기준: `questions.ts` 40문항 + `guessFormat` (`inspectQuestions.ts`) + `TARGET_FORMAT_MIX`
- 참고: `artifacts/question-inspection-report.json` (2026-09-07, formatCounts 일치)
- 참고: `guessFormat`은 **map-region을 반환하는 분기가 없음** → 공간 단서 문항도 source-who/what 등으로 집계될 수 있음

## 1. 포맷별 현황 vs 목표

목표 문항 수 = `round(TARGET% × 40)`. 갭 = 목표 − 현재(양수=부족).

| formatId | 명칭 | 현재 | 비중% | 목표% | 목표수 | 갭 | 판정 |
|---|---|---:|---:|---:|---:|---:|---|
| source-underline | 밑줄 ㉠ 추론 | 1 | 2.5 | 8 | 3 | **+2** | 부족 |
| map-region | 지역·공간 단서 | 0 | 0 | 4 | 2 | **+2** | 전무 |
| king-compare | 두 왕/정책 비교 | 1 | 2.5 | 6 | 2 | +1 | 부족 |
| policy-name | 제도 명칭 | 1 | 2.5 | 6 | 2 | +1 | 부족 |
| wrong-statement | 옳지 않은 것 | 1 | 2.5 | 6 | 2 | +1 | 부족 |
| chronology-labeled | (가)(나)(다) 배열 | 2 | 5.0 | 8 | 3 | +1 | 부족 |
| policy-content | 제도 내용 | 2 | 5.0 | 8 | 3 | +1 | 부족 |
| heritage-period | 문화재→시기 | 1 | 2.5 | 4 | 2 | +1 | 부족 |
| org-activity | 단체·운동 | 2 | 5.0 | 6 | 2 | 0 | 충족 |
| cause-effect | 원인·결과 | 2 | 5.0 | 6 | 2 | 0 | 충족 |
| chronology-events | 사건 순서 | 5 | 12.5 | 12 | 5 | 0 | 충족 |
| source-who | 사료→인물 | 6 | 15.0 | 12 | 5 | −1 | 약간 과다 |
| king-policy-match | 왕↔업적 | 6 | 15.0 | 12 | 5 | −1 | 약간 과다 |
| source-what | 사료→사건/제도 | 10 | 25.0 | 10 | 4 | **−6** | 과다 |

### 시대 분포 (참고)

prehistoric 3 · three-kingdoms 5 · north-south 3 · goryeo 8 · joseon-early 3 · joseon-late 4 · opening 3 · colonial 4 · modern 3 · culture 4

## 2. 상위 부족 포맷 (Top 5)

1. **map-region** — 현재 0, 목표 2. 휴리스틱 미지원 + 문항 부재.
2. **source-underline** — 현재 1(q-01만), 목표 3. 선사 외 시대 공백.
3. **king-compare** — 현재 1(q-13 광종↔성종만), 목표 2.
4. **policy-name** — 현재 1(q-38 대동법), 목표 2.
5. **wrong-statement** — 현재 1(q-03 청동기만), 목표 2.

(근접 6~8위: chronology-labeled / policy-content / heritage-period — 각 +1)

## 3. 작성 우선순위 원칙

- **신규**로 부족 포맷을 채우고, 가능하면 **source-what 과다분**(10→4)을 같은 시대·주제로 **교체**하는 편이 효율적.
- 골격은 출제 의도만; 공식 기출 문장·이미지 복제 금지.
- 오답은 인접 시대·유사 제도·혼동 인물만.
- map-region은 stem/passage에 공간 단서(천도·유역·진출로 등)를 넣고, 검사기 휴리스틱 보강도 병행 권장.

## 4. 재작성/신규 큐 — 우선 15문항

| # | 조치 | formatId | era | diff | 골격(한 줄) |
|---:|---|---|---|---:|---|
| 1 | 신규 | map-region | three-kingdoms | 2 | 한강 유역 확보·순수 등 공간 단지 → 왕/세력 고르기 |
| 2 | 신규 | map-region | goryeo | 2 | 강화 천도·해안 방어 공간 단서 → 시기/사건 고르기 |
| 3 | 신규 | source-underline | goryeo | 2 | 밑줄 ㉠(제도·사건)에 대한 설명으로 옳은/옳지 않은 것은? |
| 4 | 신규 | source-underline | joseon-early | 2 | 밑줄 ㉠(정책 단서)의 의미·시기로 적절한 것은? |
| 5 | 신규 | king-compare | joseon-early | 3 | 태종과 세종의 정책을 비교한 것으로 가장 적절한 것은? |
| 6 | 신규 | policy-name | joseon-late | 2 | 밑줄 ㉠ 제도의 명칭으로 옳은 것은? (군포·균역 계열) |
| 7 | 신규 | wrong-statement | goryeo | 2 | ○○(왕/제도)에 대한 설명으로 옳지 않은 것은? |
| 8 | 신규 | chronology-labeled | opening | 3 | (가)~(다) 개항기 사건을 일어난 순서대로 배열한 것은? |
| 9 | 신규 | policy-content | goryeo | 2 | ○○제도(전시과/기인 등)에 대한 설명으로 옳은 것은? |
| 10 | 신규 | heritage-period | culture | 1 | 다음 문화유산이 조성된 시기로 가장 적절한 것은? (인접 왕조 선지) |
| 11 | 교체(q-08류) | source-underline | north-south | 2 | 밑줄 ㉠ 시기의 사회상으로 적절한 것은? (남북국) |
| 12 | 교체(q-15류) | wrong-statement | goryeo | 3 | 무신·삼별초 관련 설명으로 옳지 않은 것은? |
| 13 | 교체(q-20류) | king-compare | joseon-early | 3 | A·B 법전/관제 성격을 비교한 것으로 적절한 것은? |
| 14 | 교체(q-27류) | cause-effect | colonial | 2 | ○○ 조약/운동의 영향으로 가장 적절한 것은? |
| 15 | 교체(q-35류) | heritage-period | culture | 1 | 문화유산 단서 → 조성 시기(왕조) 고르기 |

### 큐 요약 (15건)

| formatId | 건수 |
|---|---:|
| map-region | 2 |
| source-underline | 3 |
| king-compare | 2 |
| wrong-statement | 2 |
| heritage-period | 2 |
| policy-name | 1 |
| chronology-labeled | 1 |
| policy-content | 1 |
| cause-effect | 1 |

신규 10 + source-what 계열 교체 5 → 부족 포맷을 목표선 근처로 끌어올리고 source-what 과다를 완화.

## 5. 다음 액션

1. 위 15골격으로 문항 초안 작성 (`examFormats` failPatterns 준수).
2. `inspectQuestions`에 map-region 휴리스틱 추가(예: 천도/유역/진출/지역 키워드).
3. 재검사 후 formatCounts가 TARGET에 ±1 이내인지 확인.
)
