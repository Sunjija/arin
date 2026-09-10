# 공식 심화 기출 분석 계약 v1

상태: **수신 계약**. 이 저장소의 학습·문항 품질·모의고사 조립 작업은 기출을 직접 수집·집계하지 않는다.  
분석 전담 에이전트가 산출물을 전달하면, 출처와 검토 수준을 확인한 뒤에만 연동한다.

- 분석 담당 런: [심화 기출 패턴 분석](https://cursor.com/agents/bc-9db7d43d-0b5b-415f-bf6c-40eb3f9eb248) (`bc-9db7d43d-0b5b-415f-bf6c-40eb3f9eb248`)
- 품질·버전·조립 담당(병렬): [전체 개편 공통 기반](https://cursor.com/agents/bc-f8adfbe0-b62e-4b51-9ba0-af66323a1da6) / PR `#8` `cursor/mock-exam-quality-1da6`
- 이 문서를 두는 작업: 개인별 일일 학습·복습 (`cursor/daily-review-loop-abb6`)

공식 문제지 원문·이미지·선지 전문은 저장소에 넣지 않는다.

---

## 1. 역할 분리

| 작업 | 담당 | 하지 않는 일 |
|---|---|---|
| 기출 수집, 문항별 패턴 태깅, 관측 비율 산출 | 분석 에이전트 | 학습 세션 UI, 모의고사 조립 구현 |
| 문항 품질 검수, 콘텐츠 버전, 모의고사 스냅샷·조립 | 품질/조립 병렬 작업 | 기출 원문 수집, 관측 비율 재계산 |
| 개인별 오늘 학습·간격 복습 | 이 브랜치 | 기출 수집·패턴 분석·관측 비율 재구현, 별도 SRS 저장소 |

학습·조립 코드는 분석 결과를 **어댑터로만** 읽는다. `officialExamAnalysis` 파이프라인, 크롤러, 회차별 원문 저장소를 이 브랜치에 새로 만들지 않는다.

---

## 2. 현재 진행 상태 (2026-09-10, `main` `a88ec9a` 기준)

### 2.1 분석 에이전트

- 런 상태: 실행 중, 브랜치·PR·이벤트 없음, 코드 변경 기록 없음.
- 전달된 산출물: **없음**.
- 따라서 관측 비율은 아직 연동하지 않는다.

### 2.2 `main`에 있는 참고값 (관측 완료가 아님)

| 자료 | 내용 | 검토 수준 |
|---|---|---|
| `src/lib/examScoring.ts` `ADVANCED_POINT_QUOTA` | 77·78·79회 정답표 배점 빈도 1점 10 / 2점 30 / 3점 10 | 정답표 배점만 확인. 문항 패턴 아님 |
| `src/data/examFormats.ts` `TARGET_FORMAT_MIX` | 은행 작성용 목표 비중(합 100) | **편집 목표**. 관측 비율이 아님 |
| `artifacts/hanguksa-exam-research.md` | 시험 골격·평가 유형 매핑 | 공개 안내 정리. 원문 없음 |
| `artifacts/question-type-coverage.md` | 자체 은행 40문항 vs 작성 목표 | 우리 은행 공백. 기출 관측 아님 |
| `src/data/inspectQuestions.ts` | 자체 문항 휴리스틱 검수 | 기출 분석 아님 |

위 값을 UI나 조립 결과에서 “공식 출제 비율”이라고 표시하지 않는다.

### 2.3 병렬 품질 작업(PR `#8`)에 있는 초안 — 복사하지 않음

PR `#8`의 `src/data/officialExamAnalysis.ts`는 분석 파이프라인이 아니라 **수신 자리**다.

- 대상 범위 기록: 심화 65~79회 750문항.
- 제79회 10문항: `outline-only` + `tagConfidence: 'estimate'`. 원문·배점 미수록.
- 65~78회와 79회 나머지 40문항: 미분석.
- `computeTargetMix()`는 완료 태그가 없으면 `basis: 'provisional'`.
- 확인된 값으로 명시된 것: 77~79회 배점 구성만.
- 전근대 61% / 근현대 39%는 임시값.

이 브랜치는 해당 파일을 가져오거나 재구현하지 않는다. 병합 후 어댑터가 같은 계약으로 읽는다.

---

## 3. 산출물 스키마

분석 에이전트는 아래 JSON을 파일로 전달한다. 권장 경로:

- `artifacts/analysis/official-exam-analysis-v1.json` (기계용)
- `artifacts/analysis/official-exam-analysis-v1.md` (출처·한계 설명)

```ts
export const OFFICIAL_EXAM_ANALYSIS_SCHEMA = 'official-exam-analysis-v1'

export type AnalysisReviewLevel =
  | 'raw-collect'              // 수집만. 비율 연동 금지
  | 'outline-only'             // 측정 방식만. 원문·배점 미확인
  | 'partial-tags'             // 일부 회차만 태깅
  | 'human-reviewed-complete'  // 사람 검토를 거친 관측 비율

export interface OfficialExamAnalysisPayload {
  schemaVersion: 'official-exam-analysis-v1'
  producedBy: string            // 런 id 또는 문서 경로
  producedAt: string            // ISO-8601
  source: {
    corpus: string              // 예: official-advanced-65-79
    rounds: number[]
    itemCount: number
    includesOfficialText: false // true 이면 수신 거부
    includesOfficialImages: false
  }
  review: {
    level: AnalysisReviewLevel
    reviewerId: string | null   // 사람 검토 시에만
    reviewedAt: string | null
    notes: string
  }
  coverage: {
    targetItemCount: number
    taggedComplete: number
    outlineOnly: number
    notAnalyzed: number
  }
  observed: {
    pointQuota: { 1: number; 2: number; 3: number } | null
    eraBloc: { premodern: number; modern: number } | null
    formatMix: Record<string, number> | null
    officialSkillType: Record<string, number> | null
    stimulusType: Record<string, number> | null
  }
  /** 문항별 패턴. 원문·선지·이미지 없음 */
  items: Array<{
    round: number
    number: number
    analysisStatus: 'not-analyzed' | 'outline-only' | 'complete'
    points: 1 | 2 | 3 | null
    era: string | null
    topic: string | null
    officialSkillType: string | null
    internalFormatId: string | null
    stimulusType: string | null
    visualRequired: boolean | null
    tagConfidence: 'unset' | 'estimate' | 'confirmed'
    notes: string
  }>
}
```

`observed.*` 비율은 해당 차원의 완료 태그가 있을 때만 채운다. 추정값을 `confirmed`로 올리지 않는다.

---

## 4. 연동 게이트

수신 코드(`src/lib/officialAnalysisAdapter.ts`)는 다음을 모두 통과한 뒤에만 `basis: 'analyzed'`로 쓴다.

1. `schemaVersion === 'official-exam-analysis-v1'`
2. `source.includesOfficialText === false` 이고 `includesOfficialImages === false`
3. `review.level === 'human-reviewed-complete'`
4. `review.reviewerId`와 `review.reviewedAt`이 있음
5. `coverage.taggedComplete`가 대상 문항의 충분한 범위인지 문서화된 하한 이상  
   (기본 하한: 대상 750문항의 완료 태그가 아니면 전체 비율로 쓰지 않고 `partial`로 표시)
6. `observed` 값이 null인 차원은 기존 임시 목표를 유지하고, 임시값임을 유지

실패 시 동작:

- 학습·모의고사는 기존 로컬 휴리스틱으로 계속 동작한다.
- UI에는 “공식 출제 비율”을 쓰지 않는다.
- 거부 이유를 어댑터 결과 `rejection`에 남긴다.

`raw-collect` / `outline-only` / `partial-tags`는 참고 표시만 할 수 있고, 실전 조립 목표나 학습 완료 판정에 넣지 않는다.

---

## 5. 이 브랜치가 재사용하는 것 / 만들지 않는 것

재사용:

- 간격 반복: `src/lib/spacedRepetition.ts` + `cards.nextReviewAt`
- 오늘 세션: `src/lib/studyService.ts`의 세션·진도·오답
- 자체 문항 검수: `src/data/inspectQuestions.ts`
- 모의 배점 환산: `src/lib/examScoring.ts`의 점수 계산 (비율 재수집 없음)

만들지 않음:

- 기출 크롤/수집기
- 회차별 원문 코퍼스
- 관측 비율 집계기
- PR `#8`의 `officialExamAnalysis.ts` / `examMix.ts` 복제

---

## 6. 품질·조립 작업과의 연결

문항 품질·버전 보호·모의고사 조립은 병렬 작업이 진행 중이다. 이 브랜치는:

- 과거 학습 답안의 **문항 스냅샷**을 학습 세션에 남긴다 (문항 원문이 바뀌어도 당시 선지·정답이 유지).
- 실전 승인 문항이 없으면 적용 평가를 “준비되지 않음”으로 안내한다.
- 미검수 문항을 실전 승인처럼 쓰지 않는다.
- 분석 산출물이 오면 이 계약의 게이트를 통과한 뒤에만 일일 학습의 안내 문구·부족 안내에 반영한다. 조립 알고리즘 자체는 품질 작업의 `examMix`에 맡긴다.
