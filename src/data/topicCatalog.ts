/**
 * 한능검 심화 학습 토픽 카탈로그.
 * 고조선~근현대·문화사 전 범위를 단원·권장 포맷·빈출 키워드로 정리.
 * 공식 기출 문장 없음 — 자체 문항/단원/카드 설계용.
 */

import type { EraId, QuestionType } from '../types'
import type { ExamFormatId } from './examFormats'

export interface TopicEntry {
  id: string
  era: EraId
  title: string
  /** 출제·학습 핵심 키워드 (기출 복제 아님) */
  keywords: string[]
  /** 권장 문항 포맷 (우선순위 순) */
  formats: ExamFormatId[]
  tags: QuestionType[]
  /** 심화에서 상대 비중: high = 자주 출제되는 축 */
  weight: 'high' | 'mid' | 'low'
  lessonId?: string
}

/** 전근대사 ≈ 60% / 근현대 ≈ 40% 감각으로 weight를 배치 */
export const TOPIC_CATALOG: TopicEntry[] = [
  // ─── 선사·고조선·초기국가 ───
  {
    id: 't-pre-01',
    era: 'prehistoric',
    title: '선사 문화 표지',
    keywords: ['빗살무늬토기', '움집', '민무늬토기', '비파형동검', '고인돌'],
    formats: ['source-underline', 'wrong-statement', 'heritage-period'],
    tags: ['chronology', 'cultural-heritage', 'source'],
    weight: 'mid',
    lessonId: 'lesson-01',
  },
  {
    id: 't-pre-02',
    era: 'prehistoric',
    title: '고조선과 위만조선',
    keywords: ['단군', '위만', '왕검성', '8조법', '한 군현'],
    formats: ['source-who', 'source-what', 'wrong-statement'],
    tags: ['king-figure', 'political-system', 'source'],
    weight: 'mid',
    lessonId: 'lesson-01',
  },
  {
    id: 't-pre-03',
    era: 'prehistoric',
    title: '부여·옥저·동예·삼한',
    keywords: ['부여', '옥저', '동예', '마한', '진한', '변한', '소도'],
    formats: ['source-what', 'wrong-statement', 'map-region'],
    tags: ['political-system', 'source'],
    weight: 'low',
    lessonId: 'lesson-01',
  },

  // ─── 삼국 ───
  {
    id: 't-tk-01',
    era: 'three-kingdoms',
    title: '고구려 전성기',
    keywords: ['광개토대왕', '장수왕', '평양 천도', '남진', '광개토왕릉비'],
    formats: ['source-who', 'map-region', 'king-policy-match'],
    tags: ['king-figure', 'chronology', 'source'],
    weight: 'high',
    lessonId: 'lesson-02',
  },
  {
    id: 't-tk-02',
    era: 'three-kingdoms',
    title: '백제 흥망',
    keywords: ['근초고왕', '한성', '웅진', '사비', '성왕', '관산성'],
    formats: ['map-region', 'chronology-events', 'source-who'],
    tags: ['king-figure', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-02',
  },
  {
    id: 't-tk-03',
    era: 'three-kingdoms',
    title: '신라 중앙집권',
    keywords: ['법흥왕', '진흥왕', '골품제', '화랑', '순수비', '한강'],
    formats: ['king-policy-match', 'map-region', 'king-compare'],
    tags: ['king-figure', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-02',
  },
  {
    id: 't-tk-04',
    era: 'three-kingdoms',
    title: '삼국 불교·문화',
    keywords: ['이차돈', '황룡사', '미륵사', '무령왕릉', '담덕'],
    formats: ['heritage-period', 'source-underline', 'cause-effect'],
    tags: ['cultural-heritage', 'source'],
    weight: 'mid',
    lessonId: 'lesson-12',
  },

  // ─── 남북국 ───
  {
    id: 't-ns-01',
    era: 'north-south',
    title: '신라 통일과 제도',
    keywords: ['문무왕', '신문왕', '녹읍', '관료전', '민정문서', '골품'],
    formats: ['policy-content', 'wrong-statement', 'chronology-events'],
    tags: ['political-system', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-03',
  },
  {
    id: 't-ns-02',
    era: 'north-south',
    title: '발해',
    keywords: ['대조영', '발해', '5경', '당·일본 교섭', '해동성국'],
    formats: ['source-who', 'map-region', 'wrong-statement'],
    tags: ['king-figure', 'source'],
    weight: 'mid',
    lessonId: 'lesson-03',
  },
  {
    id: 't-ns-03',
    era: 'north-south',
    title: '후삼국과 고려 건국',
    keywords: ['견훤', '궁예', '왕건', '후백제', '태봉'],
    formats: ['chronology-labeled', 'source-who', 'cause-effect'],
    tags: ['chronology', 'king-figure'],
    weight: 'mid',
    lessonId: 'lesson-03',
  },

  // ─── 고려 ───
  {
    id: 't-go-01',
    era: 'goryeo',
    title: '광종·성종 왕권·유교',
    keywords: ['노비안검법', '과거', '공복', '최승로', '시무28조', '12목'],
    formats: ['source-who', 'king-compare', 'king-policy-match'],
    tags: ['king-figure', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-04',
  },
  {
    id: 't-go-02',
    era: 'goryeo',
    title: '고려 통치·수취 제도',
    keywords: ['전시과', '기인', '정방', '중방', '도병마사'],
    formats: ['policy-content', 'policy-name', 'wrong-statement'],
    tags: ['political-system'],
    weight: 'high',
    lessonId: 'lesson-13',
  },
  {
    id: 't-go-03',
    era: 'goryeo',
    title: '무신·대몽·삼별초',
    keywords: ['정중부', '최충헌', '강화천도', '삼별초', '개경환도'],
    formats: ['chronology-events', 'map-region', 'org-activity'],
    tags: ['chronology', 'independence-org'],
    weight: 'high',
    lessonId: 'lesson-05',
  },
  {
    id: 't-go-04',
    era: 'goryeo',
    title: '원 간섭·공민왕',
    keywords: ['정동행성', '쌍성총관부', '기철', '신돈', '전민변정도감'],
    formats: ['source-who', 'cause-effect', 'wrong-statement'],
    tags: ['king-figure', 'political-system', 'chronology'],
    weight: 'high',
    lessonId: 'lesson-13',
  },
  {
    id: 't-go-05',
    era: 'goryeo',
    title: '고려 문화·사상',
    keywords: ['팔만대장경', '직지', '청자', '지눌', '묘청'],
    formats: ['heritage-period', 'source-underline', 'cause-effect'],
    tags: ['cultural-heritage', 'source'],
    weight: 'mid',
    lessonId: 'lesson-11',
  },

  // ─── 조선 전기 ───
  {
    id: 't-je-01',
    era: 'joseon-early',
    title: '태조~태종 왕권',
    keywords: ['위화도', '정도전', '사병혁파', '호패법', '6조직계'],
    formats: ['king-policy-match', 'king-compare', 'cause-effect'],
    tags: ['king-figure', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-06',
  },
  {
    id: 't-je-02',
    era: 'joseon-early',
    title: '세종·문물 정비',
    keywords: ['훈민정음', '집현전', '공법', '의정부서사', '측우기'],
    formats: ['source-who', 'policy-content', 'king-compare'],
    tags: ['king-figure', 'cultural-heritage'],
    weight: 'high',
    lessonId: 'lesson-06',
  },
  {
    id: 't-je-03',
    era: 'joseon-early',
    title: '법전·관제',
    keywords: ['경국대전', '속대전', '의정부', '삼사', '대명률'],
    formats: ['policy-content', 'wrong-statement', 'policy-name'],
    tags: ['political-system'],
    weight: 'high',
    lessonId: 'lesson-06',
  },
  {
    id: 't-je-04',
    era: 'joseon-early',
    title: '사림·훈구·사화',
    keywords: ['김종직', '조광조', '기묘사화', '을사사화', '붕당'],
    formats: ['source-who', 'chronology-labeled', 'cause-effect'],
    tags: ['political-system', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-14',
  },

  // ─── 조선 후기 ───
  {
    id: 't-jl-01',
    era: 'joseon-late',
    title: '수취 제도 개혁',
    keywords: ['대동법', '균역법', '영정법', '방납', '군포'],
    formats: ['policy-name', 'policy-content', 'king-compare'],
    tags: ['political-system'],
    weight: 'high',
    lessonId: 'lesson-07',
  },
  {
    id: 't-jl-02',
    era: 'joseon-late',
    title: '붕당·탕평·세도',
    keywords: ['환국', '탕평책', '세도정치', '안동김씨', '삼정의 문란'],
    formats: ['source-what', 'wrong-statement', 'cause-effect'],
    tags: ['political-system', 'chronology'],
    weight: 'high',
    lessonId: 'lesson-07',
  },
  {
    id: 't-jl-03',
    era: 'joseon-late',
    title: '실학·민란',
    keywords: ['유형원', '정약용', '북학', '홍경래', '임술민란'],
    formats: ['source-who', 'org-activity', 'chronology-events'],
    tags: ['king-figure', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-07',
  },
  {
    id: 't-jl-04',
    era: 'joseon-late',
    title: '영·정조 문화',
    keywords: ['규장각', '수원화성', '초계문신', '실학', '정조'],
    formats: ['heritage-period', 'source-who', 'map-region'],
    tags: ['cultural-heritage', 'king-figure'],
    weight: 'mid',
    lessonId: 'lesson-11',
  },

  // ─── 개항~대한제국 ───
  {
    id: 't-op-01',
    era: 'opening',
    title: '개항과 불평등 조약',
    keywords: ['강화도조약', '조·청상민수륙무역장정', '조일통상', '거문도'],
    formats: ['chronology-events', 'cause-effect', 'source-underline'],
    tags: ['chronology', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-08',
  },
  {
    id: 't-op-02',
    era: 'opening',
    title: '개화·척사·농민전쟁',
    keywords: ['위정척사', '갑신정변', '동학농민', '갑오개혁', '을미사변'],
    formats: ['chronology-labeled', 'org-activity', 'source-what'],
    tags: ['chronology', 'independence-org'],
    weight: 'high',
    lessonId: 'lesson-08',
  },
  {
    id: 't-op-03',
    era: 'opening',
    title: '대한제국·독립협회',
    keywords: ['대한제국', '광무개혁', '독립협회', '만민공동회', '대한국국제'],
    formats: ['org-activity', 'policy-content', 'wrong-statement'],
    tags: ['independence-org', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-08',
  },

  // ─── 일제강점 ───
  {
    id: 't-co-01',
    era: 'colonial',
    title: '국권 피탈 과정',
    keywords: ['을사늑약', '정미7조약', '한일병합', '통감부', '군대해산'],
    formats: ['chronology-events', 'cause-effect', 'wrong-statement'],
    tags: ['chronology', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-09',
  },
  {
    id: 't-co-02',
    era: 'colonial',
    title: '3·1과 임시정부',
    keywords: ['3·1운동', '임시정부', '민주공화제', '연통제', '파리강화'],
    formats: ['cause-effect', 'org-activity', 'source-what'],
    tags: ['independence-org', 'chronology'],
    weight: 'high',
    lessonId: 'lesson-09',
  },
  {
    id: 't-co-03',
    era: 'colonial',
    title: '독립운동 노선',
    keywords: ['의열단', '한인애국단', '한국광복군', '실력양성', '사회주의'],
    formats: ['org-activity', 'king-compare', 'wrong-statement'],
    tags: ['independence-org'],
    weight: 'high',
    lessonId: 'lesson-09',
  },
  {
    id: 't-co-04',
    era: 'colonial',
    title: '식민 통치 변화',
    keywords: ['무단통치', '문화통치', '산미증식', '국가총동원', '황민화'],
    formats: ['chronology-labeled', 'policy-content', 'cause-effect'],
    tags: ['political-system', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-15',
  },

  // ─── 현대 ───
  {
    id: 't-mo-01',
    era: 'modern',
    title: '해방·정부 수립·전쟁',
    keywords: ['모스크바3상', '5·10선거', '정부수립', '6·25', '휴전'],
    formats: ['chronology-events', 'cause-effect', 'wrong-statement'],
    tags: ['chronology', 'political-system'],
    weight: 'high',
    lessonId: 'lesson-10',
  },
  {
    id: 't-mo-02',
    era: 'modern',
    title: '민주화 운동',
    keywords: ['4·19', '5·16', '유신', '5·18', '6월항쟁'],
    formats: ['chronology-labeled', 'source-what', 'cause-effect'],
    tags: ['chronology', 'independence-org'],
    weight: 'high',
    lessonId: 'lesson-10',
  },
  {
    id: 't-mo-03',
    era: 'modern',
    title: '경제·사회 변화',
    keywords: ['경제개발계획', '새마을', '중화학', 'IMF', '남북정상회담'],
    formats: ['policy-content', 'chronology-events', 'wrong-statement'],
    tags: ['political-system', 'chronology'],
    weight: 'mid',
    lessonId: 'lesson-16',
  },

  // ─── 문화사 (횡단) ───
  {
    id: 't-cu-01',
    era: 'culture',
    title: '불교 미술·인쇄',
    keywords: ['석굴암', '불국사', '팔만대장경', '직지', '고려청자'],
    formats: ['heritage-period', 'source-underline', 'wrong-statement'],
    tags: ['cultural-heritage', 'source'],
    weight: 'mid',
    lessonId: 'lesson-11',
  },
  {
    id: 't-cu-02',
    era: 'culture',
    title: '조선 문자·과학·성곽',
    keywords: ['훈민정음', '측우기', '수원화성', '동의보감', '택리지'],
    formats: ['heritage-period', 'source-who', 'policy-name'],
    tags: ['cultural-heritage', 'king-figure'],
    weight: 'mid',
    lessonId: 'lesson-11',
  },
]

export const TOPICS_BY_ERA: Record<EraId, TopicEntry[]> = TOPIC_CATALOG.reduce(
  (acc, t) => {
    ;(acc[t.era] ??= []).push(t)
    return acc
  },
  {} as Record<EraId, TopicEntry[]>,
)

/** 전근대 / 근현대 비중 점검용 */
export function eraBalanceSummary() {
  const premodern: EraId[] = [
    'prehistoric',
    'three-kingdoms',
    'north-south',
    'goryeo',
    'joseon-early',
    'joseon-late',
    'culture',
  ]
  const modern: EraId[] = ['opening', 'colonial', 'modern']
  const score = (w: TopicEntry['weight']) => (w === 'high' ? 3 : w === 'mid' ? 2 : 1)
  const pre = TOPIC_CATALOG.filter((t) => premodern.includes(t.era)).reduce((s, t) => s + score(t.weight), 0)
  const mod = TOPIC_CATALOG.filter((t) => modern.includes(t.era)).reduce((s, t) => s + score(t.weight), 0)
  const total = pre + mod
  return {
    topicCount: TOPIC_CATALOG.length,
    premodernWeight: pre,
    modernWeight: mod,
    premodernPct: Math.round((pre / total) * 100),
    modernPct: Math.round((mod / total) * 100),
  }
}
