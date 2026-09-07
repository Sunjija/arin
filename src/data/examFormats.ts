/**
 * 한능검 심화 “문제 형식(포맷)” 카탈로그.
 * 공식 기출 문장/이미지는 포함하지 않음. 출제 골격·변별 포인트만 정리.
 *
 * 사용:
 * - 신규 문항 작성 전 이 목록에서 formatId를 고른다
 * - 검사 에이전트는 은행 문항이 어느 포맷인지/요건을 지키는지 판정한다
 */

export type ExamFormatId =
  | 'source-who'
  | 'source-what'
  | 'source-underline'
  | 'chronology-events'
  | 'chronology-labeled'
  | 'king-policy-match'
  | 'king-compare'
  | 'policy-name'
  | 'policy-content'
  | 'wrong-statement'
  | 'org-activity'
  | 'heritage-period'
  | 'cause-effect'
  | 'map-region' // 텍스트로만 지역 단서 제시 (이미지 없음)

export interface ExamFormatSpec {
  id: ExamFormatId
  name: string
  /** 한능검에서 자주 보이는 출제 의도 */
  intent: string
  /** 문항 골격 (문장 템플릿, 기출 복제 아님) */
  skeleton: string
  /** 좋은 선지 조건 */
  goodDistractors: string[]
  /** 금지/실패 패턴 (AI 급조 티) */
  failPatterns: string[]
  /** 권장 배점 */
  typicalPoints: 1 | 2 | 3 | '1-2' | '2-3'
  /** 우리 태그와의 매핑 */
  relatedTags: Array<
    | 'king-figure'
    | 'chronology'
    | 'source'
    | 'cultural-heritage'
    | 'independence-org'
    | 'political-system'
  >
}

export const EXAM_FORMATS: ExamFormatSpec[] = [
  {
    id: 'source-who',
    name: '사료 → 인물/왕 고르기',
    intent: '단서로 인물을 추론. 지문에 답이 직접 나오면 실패.',
    skeleton: '다음 자료의 인물(왕)으로 옳은 것은? + 정책/사건 단서 지문 + 인물명 5지',
    goodDistractors: [
      '같은 왕조·인접 시기 인물',
      '비슷한 정책을 한 다른 왕',
      '이름이 자주 같이 나오는 인물',
    ],
    failPatterns: [
      '정답 선지가 지문 문장을 거의 그대로 반복',
      '오답이 전혀 다른 시대(신석기↔독립운동)로만 구성',
      '지문에 이미 인물명이 나와 있음',
    ],
    typicalPoints: 2,
    relatedTags: ['source', 'king-figure'],
  },
  {
    id: 'source-what',
    name: '사료 → 사건/제도 고르기',
    intent: '자료가 가리키는 사건·제도를 식별.',
    skeleton: '다음 설명이 가리키는 것으로 옳은 것은? + 우회 서술 지문 + 사건/제도명 5지',
    goodDistractors: ['같은 시기 유사 사건', '원인·결과만 비슷한 다른 제도'],
    failPatterns: ['지문 핵심 키워드가 정답 선지에 그대로 노출', '오답이 황당 시대 섞기'],
    typicalPoints: '2-3',
    relatedTags: ['source', 'political-system', 'chronology'],
  },
  {
    id: 'source-underline',
    name: '밑줄 ㉠ 추론',
    intent: '밑줄 친 부분의 시대·제도·의미 파악.',
    skeleton: '밑줄 친 ㉠에 대한 설명으로 옳은/옳지 않은 것은?',
    goodDistractors: ['인접 시대 표지 유물/제도', '같은 계열 제도(대동법↔균역법)'],
    failPatterns: ['㉠ 설명이 정답과 동의어 반복', '옳지 않은 것인데 오답이 너무 자명'],
    typicalPoints: '1-2',
    relatedTags: ['source', 'chronology', 'political-system'],
  },
  {
    id: 'chronology-events',
    name: '사건 순서 배열',
    intent: '연표 암기·전후 관계 변별.',
    skeleton: '다음 사건을 일어난 순서대로 나열한 것은? + 3~4개 사건 선택지',
    goodDistractors: ['인접 두 사건의 순서만 바꿈', '같은 시대 안에서의 혼동'],
    failPatterns: ['고조선·6월항쟁처럼 너무 먼 사건 섞기', '선택지 5개가 전부 말도 안 되는 순서'],
    typicalPoints: 3,
    relatedTags: ['chronology'],
  },
  {
    id: 'chronology-labeled',
    name: '(가)(나)(다) 배열',
    intent: '라벨된 사건을 시간순으로 배열.',
    skeleton: '(가)~(다)를 일어난 순서대로 배열한 것은? + 짧은 사건 정의',
    goodDistractors: ['앞뒤만 바뀐 배열', '가운데만 틀린 배열'],
    failPatterns: ['(가)(나)(다) 서술이 정답 선택지에 다시 풀어서 나옴'],
    typicalPoints: 3,
    relatedTags: ['chronology', 'source'],
  },
  {
    id: 'king-policy-match',
    name: '왕↔업적 짝짓기',
    intent: '왕과 정책의 정확한 연결.',
    skeleton: '왕과 업적의 연결이 바른 것은? / (가) 왕의 정책으로 옳은 것은?',
    goodDistractors: ['광종↔성종처럼 서로 뒤바꾼 선지', '같은 왕조 다른 왕 정책'],
    failPatterns: ['지문에 정책명을 다 쓰고 선지에 같은 정책명 반복', '선지에 왕 이름이 이미 힌트로 과다 노출'],
    typicalPoints: '2-3',
    relatedTags: ['king-figure', 'political-system'],
  },
  {
    id: 'king-compare',
    name: '두 왕/정책 비교',
    intent: '목적·성격 차이를 구분.',
    skeleton: 'A와 B의 정책을 비교한 것으로 가장 적절한 것은?',
    goodDistractors: ['역할을 서로 뒤바꾼 서술', '공통점만 말하고 차이를 틀린 서술'],
    failPatterns: ['비교 대상과 무관한 시대 제도를 오답으로만 채움'],
    typicalPoints: 3,
    relatedTags: ['king-figure', 'political-system'],
  },
  {
    id: 'policy-name',
    name: '제도 명칭 고르기',
    intent: '내용 단서로 제도명을 찾음.',
    skeleton: '밑줄 친 ㉠ 제도의 명칭으로 옳은 것은?',
    goodDistractors: ['대동법/균역법/과전법처럼 수취·신분 관련 인접 제도'],
    failPatterns: ['정답이 지문 설명을 그대로 다시 씀(명칭이 아니라 설명형)'],
    typicalPoints: 2,
    relatedTags: ['political-system', 'source'],
  },
  {
    id: 'policy-content',
    name: '제도 내용 고르기',
    intent: '제도명을 주고 내용을 묻거나, 내용 중 옳은 것 고르기.',
    skeleton: '○○법에 대한 설명으로 옳은 것은?',
    goodDistractors: ['이름이 비슷한 제도의 내용', '목적만 같고 수단이 다른 제도'],
    failPatterns: ['오답이 시험 범위 밖 황당 사실'],
    typicalPoints: 2,
    relatedTags: ['political-system'],
  },
  {
    id: 'wrong-statement',
    name: '옳지 않은 것 고르기',
    intent: '세부 사실 오류를 잡아내는 변별.',
    skeleton: '다음에 대한 설명으로 옳지 않은 것은?',
    goodDistractors: ['옳은 사실 4개 + 한 시대만 틀린 한 줄'],
    failPatterns: ['옳지 않은 선지가 너무 자명', '나머지 선지도 사실 오류'],
    typicalPoints: '2-3',
    relatedTags: ['chronology', 'king-figure', 'political-system', 'cultural-heritage'],
  },
  {
    id: 'org-activity',
    name: '단체·운동 성격',
    intent: '독립운동 단체/정치결사의 노선 구분.',
    skeleton: '○○의 활동으로 적절한 것은?',
    goodDistractors: ['같은 시기 다른 노선(의열/외교/실력양성)', '유사 단체 활동'],
    failPatterns: ['고대 제도와 섞인 오답', '단체명만 보고 맞히는 자명한 정답'],
    typicalPoints: 2,
    relatedTags: ['independence-org', 'political-system'],
  },
  {
    id: 'heritage-period',
    name: '문화재 → 시기',
    intent: '유산의 제작 시기를 시대 선택지로 고름.',
    skeleton: '다음 문화유산이 조성된 시기로 가장 적절한 것은?',
    goodDistractors: ['삼국~조선처럼 인접 왕조', '같은 종교 미술의 다른 시기'],
    failPatterns: ['선택지에 고조선·대한제국만 섞인 황당 구성', '유물명을 지문에 쓰고 선지에 다시 반복'],
    typicalPoints: 1,
    relatedTags: ['cultural-heritage', 'source'],
  },
  {
    id: 'cause-effect',
    name: '원인·결과·영향',
    intent: '사건 이후 영향이나 배경을 묻음.',
    skeleton: '○○의 영향으로 가장 적절한 것은?',
    goodDistractors: ['그 이전 정책', '유사 사건(4·19↔5·18↔6월)의 결과'],
    failPatterns: ['결과와 무관한 고대 사실 오답', '정답이 사건명 반복 수준'],
    typicalPoints: 2,
    relatedTags: ['chronology', 'political-system', 'independence-org'],
  },
  {
    id: 'map-region',
    name: '지역·공간 단서(텍스트)',
    intent: '이미지 없이 지역 서술로 세력/도읍/진출을 추론.',
    skeleton: '한강 유역 확보 / 평양 천도 / 강화 천도 등 공간 단서 → 왕·사건',
    goodDistractors: ['비슷한 천도·진출을 한 다른 왕'],
    failPatterns: ['외부 지도 이미지 의존', '단서 없이 지명만 나열'],
    typicalPoints: 2,
    relatedTags: ['king-figure', 'chronology', 'source'],
  },
]

export const EXAM_FORMAT_BY_ID: Record<ExamFormatId, ExamFormatSpec> = Object.fromEntries(
  EXAM_FORMATS.map((f) => [f.id, f]),
) as Record<ExamFormatId, ExamFormatSpec>

/** 은행 작성 시 목표 비중(심화 감각, 합≈100) */
export const TARGET_FORMAT_MIX: Partial<Record<ExamFormatId, number>> = {
  'source-who': 12,
  'source-what': 10,
  'source-underline': 8,
  'chronology-events': 12,
  'chronology-labeled': 8,
  'king-policy-match': 12,
  'king-compare': 6,
  'policy-name': 6,
  'policy-content': 8,
  'wrong-statement': 6,
  'org-activity': 6,
  'heritage-period': 4,
  'cause-effect': 6,
  'map-region': 4,
}
