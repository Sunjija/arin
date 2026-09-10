# 모의고사 제작 에이전트 전달

앱 조립 코드는 수정하지 않았다. 아래 파일만 읽으면 된다.

- `research/exam-patterns/blueprint-candidates.json` — 50문항·5지·100점 목표 후보, must/strong/flexible, 해밀턴 반올림
- `research/exam-patterns/distributions.json` — 회차별 배점, 시대·유형 관측 분포, 균등/최근 가중
- `research/exam-patterns/codebook.md` — 분류 정의
- `research/exam-patterns/handoff/bank-gap.json` — 현재 은행(읽기 전용) 부족 조합
- `research/exam-patterns/handoff/comparison-candidates.json` — q-57 등 10문항의 기출 비교 후보

## 반드시 지킬 조건

1. 50문항, 5지선다, 100점
2. 1점 10 · 2점 30 · 3점 10 (15개 심화 정답표에서 반복 관측, 공식 요강의 차등배점과 맞음)

## 강하게 맞출 조건

- 시대 배분: 블루프린트의 `strong.era_allocation_50` (**AI 원본 대조** 표본만. 현재 제79회 50문항)
- 키워드 자동 추정은 `estimated_auto`에만 있다. 확정 목표로 쓰지 말 것.
- 허용 오차: 관측된 회차 편차를 `distributions.json`의 회차별 표와 비교해 정할 것. 임의 ±n은 제품 선택이므로 분석 값과 구분해 기록할 것.

## 완화 가능

- 내부 형식·자료 유형은 다중 제약과 충돌하기 쉽다. must → 시대 → 형식 순으로 완화.
- 주변 비율을 각각 맞춰도 실제 회차의 앞(전근대)·뒤(근현대) 배열이 재현되지는 않는다. 회차별 구성 표를 함께 볼 것.

## 하지 말 것

- 공식 기출 문장·자료 배열·선지 묶음을 통째로 재사용하도록 안내하지 말 것.
- 이 문서를 ‘공식 출제 비율’로 인용하지 말 것.
- 비교 후보가 없는 은행 문항에 억지 연결하지 말 것.
