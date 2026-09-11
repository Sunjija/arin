# 단계 0 이후 — 병렬 배정

총괄 채팅이 통합·최종 검수를 맡는다. 페이지 담당은 아래 지시문만 새 채팅에 붙여 넣는다.

1. [B — 오늘·내 기록·설정](./briefs/B-home-progress-settings.md)
2. [C — 학습·복습](./briefs/C-study-review.md)
3. [D — 실전](./briefs/D-mock-exam.md)
4. [F — 자료실·연표](./briefs/F-library-timeline.md)

공통 전제:
- 분기점: `cursor/redesign-foundation-1da6` (계약 동결 커밋).
- `docs/parallel-redesign/contracts.md`를 먼저 읽는다.
- 자기 소유 파일만 수정한다. 계약 변경은 총괄 채팅으로.
- E의 내부 구현(테스트 보강, backup round-trip 등)은 계약 동결 이후 이 브랜치에서 계속할 수 있다.
- A의 `/library` 연결은 F 제출 후 총괄이 A 후속으로 넣는다.

통합 순서: A/E 기반 → B/C/D/F 병합 → `07` 수용 검사.
