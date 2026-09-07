# 은행 확장 요약 (고조선~근현대)

> 생성: 2026-09-07 · `자체 제작 학습문항` only · 공식 기출 문장·이미지 미사용

## 규모

| 항목 | 수량 |
|------|-----:|
| 토픽 (`topicCatalog.ts`) | 88 (시대당 6–12, `recommendedFormats`·`notes`) |
| 단원 (`lessons.ts`) | 18 |
| 문항 (`questions.ts`) | **100** |
| 카드 (`cards.ts`) | 95 |

## 문항 시대 분포

| 시대 | 수 |
|------|---:|
| prehistoric | 6 |
| three-kingdoms | 8 |
| north-south | 7 |
| goryeo | 15 |
| joseon-early | 6 |
| joseon-late | 12 |
| culture | 7 |
| opening | 11 |
| colonial | 14 |
| modern | 14 |

- **전근대**(선사~조선후기+문화) **61** / **근현대**(개항+일제+현대) **39** → 약 **61% : 39%**
- 난이도: 1점 22 · 2점 56 · 3점 22 (약 22/56/22)

## 포맷 분포 (`formatId`)

| formatId | 수 |
|----------|---:|
| policy-content | 14 |
| source-who | 10 |
| cause-effect | 10 |
| org-activity | 8 |
| wrong-statement | 7 |
| chronology-labeled | 7 |
| chronology-events | 7 |
| source-underline | 6 |
| king-compare | 6 |
| heritage-period | 6 |
| source-what | 5 |
| king-policy-match | 5 |
| policy-name | 5 |
| map-region | 4 |

이전 공백(map-region / source-underline / king-compare / wrong-statement / policy-name / chronology-labeled) 해소.

## 품질 조치

- Top10 재작성: q-01, q-02, q-08, q-09, q-16, q-20, q-27, q-36, q-37, q-40(공민왕으로 교체, 광종 중복 제거)
- 오답 = 인접 시대·유사 제도·혼동 인물만 (황당 교차 정리: q-80·q-81 등)
- 선택 `formatId` 필드 추가 (Question 타입, 하위 호환)
- 검사: `npm run typecheck` · `npm test` 통과

## 참고

- `artifacts/hanguksa-exam-research.md`
- `artifacts/question-type-coverage.md`
- `artifacts/question-review-agent.md`
- `artifacts/bank-expansion-lessons-cards.md`
