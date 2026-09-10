# 호환 메모

기존 공유 계약:

- `EraId`, `ExamFormatId`, `TARGET_FORMAT_MIX` (`src/data/examFormats.ts`, `src/types/index.ts`)
- 로드맵 태그 필드 (`artifacts/question-quality-benchmark-roadmap.md` on `codex/release-readiness-question-roadmap`)

이번 작업:

- 위 식별자를 그대로 쓰고, 검토 상태·출처 해시·다중 자료 유형을 **추가**했다.
- 앱의 `TARGET_FORMAT_MIX` 숫자는 바꾸지 않았다. 변환 결과는 `blueprint-candidates.json`.
- 호환되지 않는 제안(예: 시대 체계를 수능 단원으로 교체)은 하지 않았다.

브랜치 이름: 클라우드 에이전트 규칙에 따라 `cursor/exam-pattern-research-b248`를 썼다. 요청된 `work/exam-pattern-research`와 동명 브랜치·worktree는 없었다.
