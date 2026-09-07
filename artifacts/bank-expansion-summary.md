# 은행 확장 요약 (고조선~근현대)

## 완료

| 항목 | 수량 |
|------|-----:|
| 토픽 (`topicCatalog.ts`) | 177 |
| 단원 (`lessons.ts`) | 18 |
| 문항 (`questions.ts`) | 85 |
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
| opening | 7 |
| colonial | 9 |
| modern | 8 |
| culture | 7 |

전근대(문화 포함) 61 / 근현대 24 → 문항 기준 약 **72:28**.  
한능검 심화는 전근대 비중이 커서 1차 목표는 충족. 근현대는 이후 보강 여지.

## 포맷 분포 (formatId)

| formatId | 수 |
|----------|---:|
| source-who | 10 |
| policy-content | 9 |
| source-what | 7 |
| org-activity | 7 |
| cause-effect | 7 |
| wrong-statement | 6 |
| chronology-events | 6 |
| heritage-period | 6 |
| source-underline | 5 |
| chronology-labeled | 5 |
| king-policy-match | 5 |
| map-region | 4 |
| king-compare | 4 |
| policy-name | 4 |

이전 공백(map-region / underline / compare / wrong / policy-name) 해소.

## 품질 조치

- Top10 재작성: q-01, q-02, q-08, q-09, q-16, q-20, q-27, q-36, q-37, q-40(공민왕으로 교체)
- 공식 기출 문장·이미지 미사용 (`source: 자체 제작 학습문항`)
- `CONTENT_VERSION=2`로 기존 IndexedDB에 신규 카드 보강
- 검사: `npm run typecheck` · `npm test` 통과

## 참고 문서

- `artifacts/hanguksa-exam-research.md` — 출제 골격·6유형 매핑
- `artifacts/question-type-coverage.md` — 초기 갭 분석
- `artifacts/question-review-agent.md` — 수동 리뷰
- `artifacts/bank-expansion-lessons-cards.md` — 단원·카드 상세
