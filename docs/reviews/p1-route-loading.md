# P1 · 라우트 단위 지연 로딩

기준 SHA: `a483e7225b5566259abfb93521346529526a6d5a`  
작업 브랜치: `cursor/release-route-loading`  
확인일: 2026-09-13  
담당: Cursor A (셸·라우트 로딩, 허용 파일만)

허용 변경: `src/App.tsx`, `src/components/RouteContent.tsx`, `src/components/RouteContent.test.tsx`, `src/App.test.tsx`, 본 보고서.

## 1. 변경 요지

`App.tsx`가 모든 페이지를 정적으로 import해 단일 JS 청크가 커지던 문제를, 라우트 단위 `React.lazy` + `Suspense`로 나눈다.

| 경로 | 로딩 |
|---|---|
| `/` (`HomePage`) | 정적 import 유지 — 초기 오늘 화면이 라우트 스피너에 가리지 않음 |
| `/study`, `/cards`, `/progress`, `/mock`, `/settings`, `/library`, `/timeline` | `lazy(() => import(...))` |
| `/wrong` → `/cards`, `*` → `/` | 기존 `Navigate` 유지 |

`RouteContent`는 라우트 트리만 감싼다.

- 로딩: `화면을 불러오는 중…` (`aria-live="polite"`, 기존 `surface` 스타일)
- 실패: 한국어 안내 + **다시 시도** → `window.location.reload()`  
  (실패한 `lazy` promise는 remount만으로는 재시도되지 않음. 배포 후 오래된 청크에 적합한 전체 페이지 재시도)
- 전역 `ErrorBoundary`, `Bootstrap`, `AppShell`, `FocusLayoutProvider`, 내비는 그대로 둔다.
- IndexedDB·학습 API·문항 데이터·CSS·의존성 미변경. 서비스 워커·오프라인 캐시 주장 없음.

## 2. 수용 기준별 증거

| 기준 | 증거 |
|---|---|
| 라우트 청크 분리 | 빌드 산출물에 `StudySessionPage-*.js`, `MockExamPage-*.js`, `ProgressPage-*.js`, `LibraryPage-*.js`, `CardsPage-*.js`, `SettingsPage-*.js` 생성 |
| 초기 홈 유지 | `App.test.tsx`: bootstrap 후 `home-primary-cta` 표시, `화면을 불러오는 중…` 없음 |
| 대기 import 폴백 | `RouteContent.test.tsx`: pending lazy → `화면을 불러오는 중…` → resolve 후 본문 |
| 거부 후 재시도 | 동일 테스트: reject → alert 문구 → `다시 시도`가 `location.reload` 1회 호출. 스피너에 고립되지 않음 |
| 데이터 무음 리셋 없음 | 실패 UI는 reload만 제공. 저장소/시드/백업 코드 경로 미호출 |
| 내비·셸 보존 | `App.tsx` 라우트 path·`AppShell`/`Bootstrap`/`FocusLayout`/`ErrorBoundary` 구조 유지 |

직접 URL(`/study` 등)은 빌드 시 해당 청크가 entry에서 분리되므로 탐색 시 로드된다. **실제 브라우저에서 URL 직접 진입·기기 QA는 미실행.**

## 3. 번들 크기 (실제 빌드)

기준(변경 전, 동일 worktree에서 lazy 적용 전 `vite build`):

| 파일 | raw | gzip |
|---|---|---|
| `index-*.js` (단일 엔트리) | 642.53 kB | 197.21 kB |

변경 후:

| 파일 | raw | gzip |
|---|---|---|
| `index-*.js` (초기 엔트리) | 536.63 kB | 167.26 kB |
| `StudySessionPage-*.js` | 24.20 kB | 8.32 kB |
| `LibraryPage-*.js` | 26.67 kB | 9.16 kB |
| `MockExamPage-*.js` | 22.47 kB | 7.60 kB |
| `SettingsPage-*.js` | 11.96 kB | 4.11 kB |
| `CardsPage-*.js` | 11.59 kB | 4.23 kB |
| `ProgressPage-*.js` | 10.03 kB | 3.83 kB |

초기 엔트리 raw 약 **105.9 kB**, gzip 약 **30.0 kB** 감소. 엔트리는 여전히 500 kB 경고 구간(공유 데이터·홈·공통 셸). **청크가 작아진 것만으로 실측 시작 시간이 빨라졌다고 주장하지 않는다.**

## 4. 검증 명령·결과

Node: PATH의 Node. `node_modules`는 형제 `arin-release-quality/node_modules` junction(의존성 트리 미수정).

1. `.\node_modules\.bin\vitest.cmd run src/components/RouteContent.test.tsx src/App.test.tsx` → **2 files, 3 passed**
2. `.\node_modules\.bin\tsc.cmd -b --pretty false` → **exit 0**
3. `.\node_modules\.bin\oxlint.cmd src/App.tsx src/App.test.tsx src/components/RouteContent.tsx src/components/RouteContent.test.tsx` → **exit 0**
4. `.\node_modules\.bin\vite.cmd build` → 청크 분리 산출(위 표). 동일 명령이 Windows에서 변환 직후 비정상 종료(`-1073740791`)한 적이 한 번 있었으나 재실행으로 동일 산출을 확인함.

미실행: 전체 회귀 스위트, 실제 브라우저 직접 진입·모바일/키보드/긴 글 QA, 공개 배포, 네이티브 기기 검증.

## 5. 계약·의존성·미해결

- 공통 타입/DB/API/CSS/콘텐츠/lockfile 미변경.
- 전역 `ErrorBoundary` 동작(홈으로 `assign`)은 유지. 라우트 chunk 실패는 `RouteLoadErrorBoundary`의 reload가 우선 처리.
- 초기 엔트리 500 kB 경고는 공유 콘텐츠·홈 정적 유지로 남을 수 있음. 추가 분할은 데이터/콘텐츠 소유 범위.
- push / PR / 배포 / 추가 위임 / Cursor 설정 변경 없음.
