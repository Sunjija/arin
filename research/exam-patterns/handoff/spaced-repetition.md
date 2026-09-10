# 반복학습 에이전트 전달

앱 스케줄러 코드는 수정하지 않았다.

사용할 파일:

- `research/exam-patterns/distributions.json` → `concept_cooccurrence`, `distractor_patterns`, `official_skill_type_estimate`, `internal_format_id`
- `research/exam-patterns/items.jsonl` → 문항별 `core_concepts`, `confused_concepts`, `internal_format_id` (원문 없음)
- `research/exam-patterns/review-queue.csv` → 아직 개념이 비어 있는 문항

## 구분

| 관측 사실 | 가설 (별도) |
|---|---|
| 기출에서 개념이 나타난 횟수 | 사용자 취약도 |
| 같은 문항에 같이 붙은 개념 | 복습 주기 |
| 오답으로 자주 쓰인 혼동 쌍 | 선행 개념 학습 순서 |

출제 빈도를 취약도나 간격반복 주기와 같은 값으로 쓰지 말 것.  
학습 순서 제안은 `handoff/learning-order-hypotheses.md`에만 적는다.
