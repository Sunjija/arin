import { describe, expect, it } from 'vitest'
import {
  ANALYSIS_SCOPE,
  analysisCoverage,
  computeTargetMix,
  mixFromCompleteTags,
  ROUND_79_EDITORIAL_OUTLINES,
} from './officialExamAnalysis'

describe('official exam analysis scope', () => {
  it('targets rounds 65-79 and does not count outlines as complete', () => {
    expect(ANALYSIS_SCOPE.targetRounds).toEqual([
      65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
    ])
    expect(ANALYSIS_SCOPE.targetItemCount).toBe(750)
    expect(ANALYSIS_SCOPE.officialStemsInRepo).toBe(false)
    expect(ANALYSIS_SCOPE.officialPaperImagesInRepo).toBe(false)
    expect(ANALYSIS_SCOPE.completeTaggedCount).toBe(0)
    expect(ROUND_79_EDITORIAL_OUTLINES).toHaveLength(10)
    expect(ROUND_79_EDITORIAL_OUTLINES.every((item) => item.points == null)).toBe(true)
    expect(ROUND_79_EDITORIAL_OUTLINES.every((item) => item.analysisStatus === 'outline-only')).toBe(
      true,
    )
    expect(analysisCoverage()).toMatchObject({
      status: 'partial',
      complete: 0,
      outlineOnly: 10,
      notAnalyzed: 740,
      target: 750,
    })
  })

  it('returns a provisional mix instead of calling it an official ratio', () => {
    const mix = computeTargetMix({ recentWeight: 3, previousWeight: 1 })
    expect(mix.basis).toBe('provisional')
    expect(mix.label).toContain('공식 출제 비율 아님')
    expect(mix.weights.recentWeight).toBe(3)
    expect(mix.era.confirmed).toBe(false)
    expect(mix.points).toMatchObject({ 1: 10, 2: 30, 3: 10, confirmed: true })
    expect(mixFromCompleteTags([])).toBeNull()
  })

  it('weights complete tags and ignores unanalyzed items', () => {
    const analyzed = mixFromCompleteTags(
      [
        {
          round: 79,
          points: 1,
          eraBloc: 'premodern',
          officialSkillType: 'knowledge',
          stimulusType: 'document',
          internalFormatId: 'source-who',
        },
        {
          round: 70,
          points: 2,
          eraBloc: 'modern',
          officialSkillType: 'chronology',
          stimulusType: 'timeline',
          internalFormatId: 'chronology-events',
        },
      ],
      { recentWeight: 2, previousWeight: 1, recentRoundCount: 5 },
    )
    expect(analyzed).not.toBeNull()
    expect(analyzed!.era.premodern).toBeCloseTo(2 / 3)
    expect(analyzed!.points[1]).toBeCloseTo(2 / 3)
    expect(computeTargetMix(undefined, [
      {
        round: 79,
        points: 3,
        eraBloc: 'modern',
        officialSkillType: 'source-analysis',
        stimulusType: 'document',
        internalFormatId: 'source-what',
      },
    ]).basis).toBe('analyzed')
  })
})
