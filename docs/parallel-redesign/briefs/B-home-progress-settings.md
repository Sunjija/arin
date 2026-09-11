# 담당 B 지시문 — 오늘 · 내 기록 · 설정

이 채팅에서 **B만** 구현한다. 총괄 채팅의 단계 0 커밋(`cursor/redesign-foundation-1da6`)에서 분기한다.

필수 문서:
- `docs/parallel-redesign/contracts.md`
- `docs/parallel-redesign/ownership.md`

## 소유 파일만 수정
`src/pages/HomePage.tsx`, `ProgressPage.tsx`, `SettingsPage.tsx`, `src/components/dashboard/**`(필요 시 생성), `src/components/MasteryBar.tsx`, 해당 테스트.

금지: `src/index.css`, `App.tsx`, `studyService.ts`, `src/types/**`, `src/db/**`, lockfile.

## 오늘 (`/`)
위에서 아래로:
1. 작은 주차/오늘 표시 (`plan.week`).
2. 제목은 `오늘 학습: {plan.lesson.title}` 또는 자연스러운 조사. `focusLine`의 취약영역 결합을 쓰지 말 것.
3. 복습은 별도 한 줄: `복습: {plan.reviewLabel}`. `reviewHasEvidence`가 없으면 진단을 주장하지 않음.
4. `카드 N장 · 개념 1개 · 문제 N개 · 약 N분` 한 줄. 3개 큰 박스 금지. N은 `reviewCardCount`/`questionCount`/`estimatedMinutes`.
5. 주 CTA 하나: 진행 중 세션이면 “이어서 학습”, 아니면 “오늘 학습 시작”, 당일 완료면 보조 “추가 복습”.
6. `quantity.guidance`가 있으면 숨기지 말고 표시.

390×844에서 주 CTA 전체가 첫 화면에 보여야 한다(버튼 상단 y ≈ 500px 안쪽). 예상 40점/취약 고려/연속 0일을 경고처럼 나열하지 않는다. `scoreSummary`의 null은 “첫 학습 후 기록이 쌓여요”. `estimatedScore` 호환 필드를 점수로 보여 주지 말 것.

## 내 기록 (`/progress`)
제목 “내 기록”. 연습 정답률 / 최근 실전 연습 평균 분리. null은 “아직 기록 없음”. 목표 연속 달성은 `goalScore`. “1급 안정권” 삭제. 평균에 사용한 횟수를 읽히게. 취약 영역은 `weakAreas`(measured만). 시대/유형 막대 16개를 초기 화면에 전부 쌓지 말 것. 설정 링크 제공. 가짜 추세 문구 금지.

## 설정
학습 목표/분량, “기록 백업하기 / 기록 가져오기”, 초기화를 분리. JSON은 보조 설명. `restoreBackup`/`importAllData`만 사용. invalid import는 현재 화면에 오류. `quantitySettingsCopy()`로 하루 시간·상한 관계 설명. 초기화는 `clearAllLearningData`이며 덜 강조. HTML min/max로 런타임 검증을 대체하지 않음.

## 검증
새 사용자 / 진행 중 / 당일 완료 / practice만 / sample mock만 / full mock / 목표 60·85·100 / 백업 실패. 숫자 의미 회귀 테스트 최소. 배치는 브라우저.

제출: 변경 파일, 계약 준수, 상태별 확인, 390·데스크톱 스크린샷, 명령 결과, 남은 결함.
