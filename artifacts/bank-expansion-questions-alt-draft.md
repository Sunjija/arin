> 과거 분석·초안 기록입니다. 최신 실행 지침이나 현행 문항의 검수 완료를 의미하지 않습니다. 적용 전 기준 버전·문항·출처를 확인하고 [최신 지시](../docs/parallel-redesign/README.md)와 [문항 검수](../agents/question-inspector.md)를 따르세요.

# 문제은행 확장 요약 (q-01~q-84)

## 결과

- **총 문항:** 84 (≥80)
- **전근대 : 근현대:** 52 : 32 (약 **62% : 38%**)
- **난이도:** 1점 18 / 2점 50 / 3점 16 (약 21% / 60% / 19%)

## 재작성 (동일 ID)

| id | formatId | 요지 |
|----|----------|------|
| q-01 | source-underline | 정답=평등·공동체 사회상 (지문 토기·농경 동의어 반복 제거) |
| q-02 | source-what | 중계무역 복붙 제거; 오답=부여·옥저·진국·고구려 초기 |
| q-08 | policy-content | 오답=관료전·정전·민정문서·골품 (신라/남북국만) |
| q-09 | source-who | 해동성국 삭제; 오답=걸걸중상·대무예 등 발해 인접 |
| q-16 | source-who | 시무책·성종 직힌트 제거; 오답=쌍기·최충 혼동 |
| q-20 | policy-content | 오답=속대전·대명률·편찬 시기 혼동 |
| q-27 | cause-effect | 을사 **이후** 통감부; 오답=한일의정서·정미·기유 혼동 |
| q-36 | policy-name | 문자 체계(이두·향찰·구결) 변별; q-19와 지문 분리 |
| q-37 | heritage-period | 시기명 5지 길이 균등; 조선 후기 |
| q-40 | source-who | **공민왕** (광종 중복 해소) |

## 신규 포맷 보강

부족했던 `map-region` / `source-underline` / `king-compare` / `policy-name` / `wrong-statement` / `chronology-labeled` / `heritage-period`를 중심으로 q-41~q-84 추가. 전 문항 `formatId`·`lessonId` 명시, `...META` 유지.

## 포맷 분포

| formatId | 수 |
|----------|---:|
| policy-content | 9 |
| chronology-events | 8 |
| org-activity | 8 |
| cause-effect | 8 |
| wrong-statement | 7 |
| chronology-labeled | 6 |
| source-who | 6 |
| source-underline | 5 |
| source-what | 5 |
| king-policy-match | 5 |
| king-compare | 5 |
| heritage-period | 4 |
| policy-name | 4 |
| map-region | 4 |

## 시대 분포

| era | 수 |
|-----|---:|
| goryeo | 14 |
| colonial | 12 |
| opening | 10 |
| modern | 10 |
| three-kingdoms | 8 |
| joseon-late | 7 |
| culture | 7 |
| joseon-early | 6 |
| prehistoric | 5 |
| north-south | 5 |

## 검증

- `npm run typecheck` PASS
- `npm test` PASS (24)
