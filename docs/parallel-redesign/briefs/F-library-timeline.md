# 담당 F 지시문 — 자료실 · 연표

이 채팅에서 **F만** 구현한다. 총괄 채팅의 단계 0 커밋(`cursor/redesign-foundation-1da6`)에서 분기한다.

필수 문서: `docs/parallel-redesign/contracts.md`, `ownership.md`.

## 소유 파일만 수정
`src/pages/TimelinePage.tsx`, 신규 `src/pages/LibraryPage.tsx`, `src/components/library/**`, 해당 UI 테스트.

금지: `src/data/timeline.ts` 등 원문 내용/개수/ID, App.tsx, AppShell, index.css, types, DB.

## 자료실
`LibraryPage`를 export한다. 상단 “자료실”, 탭 “연표 / 개념”. 연표 본문은 Timeline과 공유 컴포넌트로 추출해 헤더/필터가 두 번 나오지 않게 한다. `/timeline` 직접 진입도 같은 연표 기능을 제공한다(메뉴 활성은 A가 `/timeline`을 자료실로 처리함).

A에게 넘길 것: `export function LibraryPage()` 경로. 총괄이 A에게 `/library` 라우트 연결을 요청한다. 빈 페이지를 배포 상태로 남기지 말 것 — 실제 콘텐츠가 있는 페이지만 제출.

Query: `tab`, `era`, `q`, `sort` (`navConfig.ts`의 `LIBRARY_QUERY_KEYS`). `sort=asc` 오래된 순, `desc` 최근 순.

## 연표
모바일 시대 선택은 native select. 10개 버튼을 4행으로 펼치지 않음. 390×844에서 첫 사건 상단 y 360px 이내 목표. 사건: 연도 / 사건명 / chevron + `aria-expanded`. 펼치면 기존 detail만. 검색 0건에 지우기/초기화. 빈출/오답 배지·숙련도 꾸밈 금지.

## 개념
기존 18개 `lessons`를 시대별 목록+검색. 같은 화면에서 summary/keywords/checkpoints. 열람만으로 학습 완료를 기록하지 않음. “오늘 학습으로”가 임의 단원 시작처럼 보이게 하지 않음. 그 기능이 필요하면 E 계약을 총괄에 요청.

## 검증
중복 헤더 없음, 모바일에서 콘텐츠가 필터보다 먼저, 긴 제목·기원전·검색 0건, 한글 검색, 시대/정렬, URL 복원, 키보드 펼치기. 원본 데이터 불변.

제출 형식은 총괄 00과 동일.
