> 과거 분석·초안 기록입니다. 최신 실행 지침이나 현행 문항의 검수 완료를 의미하지 않습니다. 적용 전 기준 버전·문항·출처를 확인하고 [최신 지시](../docs/parallel-redesign/README.md)와 [문항 검수](../agents/question-inspector.md)를 따르세요.

# 문제은행 확장 요약

## 결과

- **총 문항:** 95 (≥80)
- **전근대 : 근현대:** 61 : 34 (약 **64% : 36%**)
- **난이도:** 1점 21 / 2점 53 / 3점 21 (약 22% / 56% / 22%)
- 전 문항 `formatId`·`lessonId`·`...META` 적용

## 재작성 (동일 ID)

| id | formatId | 요지 |
|----|----------|------|
| q-01 | source-underline | 시기명 고르기(신석기). 지문 재서술형 정답 제거 |
| q-02 | source-what | 중계무역 복붙 제거; 오답=부여·옥저 등 고대 인접 |
| q-08 | policy-content | 오답=관료전·정전·민정문서·골품(남북국만) |
| q-09 | source-who | 해동성국 삭제; 오답=걸걸중상·대무예 등 |
| q-16 | source-who | 시무책·성종 직힌트 제거 |
| q-20 | policy-content | 속대전·대명률·편찬 시기 혼동 |
| q-27 | cause-effect | 을사 **이후** 통감부; 한일의정서·정미·기유 혼동 |
| q-36 | policy-name | ㉠ 명칭형 + 이두·향찰·구결 변별 |
| q-37 | heritage-period | 시기 선지 길이 균등(조선 후기) |
| q-40 | source-who | **공민왕** (광종 중복 해소) |

## 신규·보강

- q-41~q-85: 전 시대 커버 + 부족 포맷(`map-region`, `source-underline`, `king-compare`, `policy-name`, `wrong-statement`, `chronology-labeled`, `heritage-period`)
- q-86~q-95: 근현대 비중 보강(개항·식민·현대)

## 포맷 분포

| formatId | 수 |
|----------|---:|
| policy-content | 13 |
| source-who | 10 |
| cause-effect | 9 |
| wrong-statement | 7 |
| chronology-labeled | 7 |
| chronology-events | 7 |
| org-activity | 7 |
| source-underline | 6 |
| heritage-period | 6 |
| source-what | 5 |
| king-policy-match | 5 |
| policy-name | 5 |
| map-region | 4 |
| king-compare | 4 |

## 시대 분포

| era | 수 |
|-----|---:|
| goryeo | 15 |
| joseon-late | 12 |
| colonial | 12 |
| modern | 12 |
| opening | 10 |
| three-kingdoms | 8 |
| north-south | 7 |
| culture | 7 |
| prehistoric | 6 |
| joseon-early | 6 |

## 검증

- `npm run typecheck` PASS
- `npm test` PASS (24)
