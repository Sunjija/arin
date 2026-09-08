# 한사코치 1차 개편 — 파일 소유권

기준 HEAD: `a88ec9a` (`main`). 공통 기반 브랜치: `cursor/redesign-foundation-1da6`.

공유 파일을 여러 담당이 수정하지 않는다. 계약 변경은 총괄 기록 → 영향 담당 통지 → 소비 코드 반영 순이다. 새 서비스 파일은 이 표에 등록한 뒤 만든다.

| 담당 | 역할 | 수정 소유권 |
|---|---|---|
| A | 디자인 시스템·앱 셸 | `src/index.css`, `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/ui/**`, `src/components/layout/**`, `index.html` |
| B | 오늘·내 기록·설정 | `src/pages/HomePage.tsx`, `ProgressPage.tsx`, `SettingsPage.tsx`, `src/components/dashboard/**`, `src/components/MasteryBar.tsx`, 해당 테스트 |
| C | 학습·복습 | `src/pages/StudySessionPage.tsx`, `CardsPage.tsx`, `src/components/SessionProgress.tsx`, `src/components/study/**`, `src/lib/cardQuiz.ts` 및 대응 테스트 |
| D | 모의고사 | `src/pages/MockExamPage.tsx`, `src/components/mock/**`, `src/lib/examScoring.ts` 및 대응 테스트 |
| E | 데이터·진도·기록 | `src/types/**`, `src/db/**`, `src/lib/studyService.ts`, `scoreEstimate.ts`, `mastery.ts`, `questionSelection.ts`, `spacedRepetition.ts`, `dates.ts`, `studyLimits.ts`, `scoreSummary.ts`, `lessonProgress.ts`, `studyPlan.ts`, `wrongCard.ts`, `wrongCardContent.ts`, `mockSession.ts`, `mockEligibility.ts`, `backupValidate.ts`, `dataErrors.ts`, `src/data/defaults.ts` 및 대응 테스트 |
| F | 자료실·연표 | `src/pages/TimelinePage.tsx`, 신규 `src/pages/LibraryPage.tsx`, `src/components/library/**` |
| 총괄 | 통합·검증·문서 | `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*`, `README.md`, `docs/parallel-redesign/**` |

읽기 전용: `src/data/questions.ts`, `lessons.ts`, `cards.ts`, `timeline.ts`, `topicCatalog.ts`, `examFormats.ts`. `defaults.ts`만 E 예외.

## 단계 0에서 등록한 신규 경로

| 경로 | 담당 |
|---|---|
| `src/components/ui/**` | A |
| `src/components/layout/focusLayoutContext.ts` | A |
| `src/components/layout/FocusLayout.tsx` | A |
| `src/components/layout/useFocusLayout.ts` | A |
| `src/components/layout/useFocusLayout.ts` | A |
| `src/components/layout/navConfig.ts` | A |
| `src/types/contracts.ts` | E |
| `src/lib/scoreSummary.ts` | E |
| `src/lib/lessonProgress.ts` | E |
| `src/lib/studyPlan.ts` | E |
| `src/lib/wrongCard.ts`, `wrongCardContent.ts` | E |
| `src/lib/mockSession.ts`, `mockEligibility.ts` | E |
| `src/lib/backupValidate.ts` | E |
| `src/lib/dataErrors.ts` | E |

`/library` 라우트는 F 제출 후 A가 `App.tsx`에 연결했다. 자료실 메뉴는 `/library`로 가고, `/timeline`은 같은 `LibraryPage`를 유지한다.
