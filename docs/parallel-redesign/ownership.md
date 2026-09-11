# 역할·소유권·통합

2026-09-11. E 기반 확정 전에는 소비 화면 작업을 독립적인 전체 서비스 구현으로 확대하지 않는다. 기존 PR과 아래 경로가 겹치면 총괄이 재사용·대체 범위를 먼저 정한다.

| 역할 | 소유 범위 |
|---|---|
| 총괄 | 공통 정책·API 최종 동결, `AGENTS.md`, `.cursor/rules`, 문서, `src/App.tsx`, `src/index.css`, 공통 UI/셸, 의존성·잠금파일·설정, 병합·배포 |
| E | `src/types/**`, `src/db/**`, `src/lib/studyService.ts`, `lessonProgress.ts`, `studyPlan.ts`, `questionSelection.ts`, `mastery.ts`, `spacedRepetition.ts`, 목표·개념·기록 관련 새 서비스와 `src/data/defaults.ts` |
| B | HomePage/ProgressPage/SettingsPage 및 배정된 목표 설정 화면, dashboard 컴포넌트 |
| C | StudySessionPage/CardsPage, `components/study/**`, SessionProgress, cardQuiz/cardPrompt |
| D | MockExamPage, `components/mock/**`, examScoring/mockSession/mockEligibility/scoreSummary 및 실전 전용 새 모듈 |
| F | LibraryPage, `components/library/**`, 연표 표시·검색 |
| G | lessons/questions/cards/timeline/topicCatalog/examFormats 등 학습 콘텐츠, 콘텐츠 출처·품질 메타데이터·검수 자료 |

각 담당은 소유 코드의 회귀 테스트도 수정한다. 새 경로는 총괄이 담당을 명시한다. E와 D가 쓰는 공통 답안/스냅샷 타입은 E가 구현하고 D가 소비한다. G가 공통 타입이나 시드 마이그레이션을 임의 변경하지 않는다. F는 설명 원문을 JSX에 복제하지 않고 G 콘텐츠를 소비한다.

## 브랜치와 제출
- 별도 브랜치·worktree 사용, 총괄이 지정한 실제 통합 SHA를 기록한다. 오래된 고정 브랜치에서 새로 시작하지 않는다.
- 기존 관련 PR이 있으면 재사용 여부와 충돌 파일을 보고한다. 자동 병합하지 않는다.
- 제출 내용: 문제와 변경 후 행동, 기준 SHA, 변경 파일, 계약 영향, 검증 명령·결과, 데이터 보존 증거, 미해결 사항, 커밋·PR 주소.
- 테스트 개수만 쓰지 말고 수용 시나리오 결과를 적는다. 미실행 검증은 명시한다.
- 총괄 통합 순서: E → B 파일럿 검수 → C/F → 검수된 G 데이터·D 평가. 화면/콘텐츠/실전 범위가 준비되지 않았으면 완료라고 보고하지 않는다.
- 공개 배포는 요청된 범위와 기존 접근 설정 안에서 수행한다. 문서만 수정한 작업은 앱 배포 불필요.
