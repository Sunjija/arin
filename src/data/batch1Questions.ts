import { BATCH1_BLUEPRINT_VERSION, EMPTY_QUESTION_STATS } from './questionBank'
import type { FactSource, Question, QuestionProvenance } from '../types'

const ACCESSED = '2026-09-10'

function source(title: string, url: string, note: string): FactSource {
  return {
    title,
    url,
    accessedAt: ACCESSED,
    note,
  }
}

function provenance(sources: FactSource[]): QuestionProvenance {
  return {
    origin: 'original',
    blueprintVersion: BATCH1_BLUEPRINT_VERSION,
    factSources: sources,
    productionMethod: 'ai-draft-human-pending',
    authorId: 'batch1-editor',
    reviewAgent: 'ai',
    reviewedAt: null,
    rightsStatus: 'reconstructed-study',
    mediaRightsNote:
      '학습용 재구성 자료만 사용. 공식 문제지 원문·이미지와 제3자 문화재 사진은 없음.',
    similarityAudit: {
      status: 'not-run',
      corpusVersion: 'official-65-79-not-ingested',
      reviewed: false,
    },
  }
}

const BATCH1_FIELDS = {
  purpose: ['practice', 'mock'] as Question['purpose'],
  reviewStatus: 'in-review' as const,
  contentVersion: 2,
  officialSkillConfidence: 'authored' as const,
  stimulusTypeConfidence: 'authored' as const,
  visualRequired: false,
  stats: EMPTY_QUESTION_STATS,
  source: '자체 제작 학습문항',
  sourceUrl: '',
  license: '학습용 자체 제작',
  imageRights: '이미지 없음',
}

export const BATCH1_QUESTION_IDS = [
  'q-01',
  'q-24',
  'q-27',
  'q-52',
  'q-55',
  'q-57',
  'q-70',
  'q-86',
  'q-96',
  'q-99',
] as const

export const BATCH1_QUESTIONS: Question[] = [
  {
    ...BATCH1_FIELDS,
    id: 'q-01',
    stem: '밑줄 친 ㉠이 가리키는 시기로 옳은 것은?',
    stimulusType: 'catalog',
    stimulus: {
      kind: 'catalog',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 발굴 기록 카드',
      caption: '원문 발굴 보고서가 아니라 학습용으로 재구성한 기록이다.',
      altText:
        '강가 유적의 발굴 기록. 움집, 겉면에 기하 무늬를 새긴 토기, 초기 농경과 어로 흔적이 적혀 있다.',
      rows: [
        { label: '입지', value: '강가나 바닷가 낮은 언덕' },
        { label: '주거', value: '지면을 파고 지은 움집' },
        { label: '유물 ㉠', value: '겉면에 기하학적 무늬를 새긴 토기' },
        { label: '생업', value: '초기 농경과 어로 흔적' },
      ],
    },
    choices: ['구석기 시대', '신석기 시대', '청동기 시대', '철기 시대', '삼국 시대'],
    answerIndex: 1,
    explanation:
      '핵심 단서: 기하 무늬 토기·움집·강가 입지·초기 농경은 한 세트의 신석기 표지이다.\n정답 근거: ㉠은 빗살무늬토기를 가리키며, 신석기 취락의 전형적인 조합이다.\n오답: 구석기는 간석기·토기가 없고 동굴·막집이 중심이다. 청동기는 민무늬 토기·비파형 동검·고인돌이다. 철기·삼국은 이후 시기다.\n연결 개념: 빗살무늬토기, 움집, 신석기 생업.',
    era: 'prehistoric',
    tags: ['source', 'chronology'],
    difficulty: 1,
    lessonId: 'lesson-01',
    formatId: 'source-underline',
    officialSkillType: 'knowledge',
    reasoningSteps: 1,
    distractorStrategy: '인접 시대 표지 유물',
    provenance: provenance([
      source(
        '국사편찬위원회 우리역사넷 — 선사 시대 개관',
        'https://contents.history.go.kr/',
        '신석기 표지(토기·움집·농경) 사실 확인. 공식 문제지 원문 아님.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-24',
    stem: '다음 자료가 가리키는 사건으로 옳은 것은?',
    stimulusType: 'document',
    stimulus: {
      kind: 'document',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 정권 장악 직후 포고 요지',
      caption: '당시 원문이 아니라 급진 개화파의 단기 집권을 학습용으로 재구성한 자료이다.',
      altText:
        '급진 개화파가 사흘 남짓 정권을 잡고 개혁을 내걸었으나 청군 개입으로 무너졌고 주동 세력이 망명했다는 포고 요지.',
      body: '개화당이 궁궐을 장악한 뒤 사흘 남짓 새 정강을 내걸었다. 청군이 개입하자 정권은 무너졌고, 주동 인물 다수는 해외로 피하였다.',
    },
    choices: ['임오군란', '갑신정변', '갑오개혁', '아관파천', '독립협회 해산'],
    answerIndex: 1,
    explanation:
      '핵심 단서: 급진 개화파의 궁궐 장악, 사흘 남짓의 집권, 청군 개입과 주동 세력 망명.\n정답 근거: 이 조합은 1884년 갑신정변이다.\n오답: 임오군란은 구식 군인 봉기이다. 갑오개혁은 제도 개혁이다. 아관파천은 러시아 공사관으로의 피신이다. 독립협회 해산은 만민공동회 탄압 이후이다.\n연결 개념: 급진 개화파, 청의 내정 간섭, 갑오개혁과의 구분.',
    era: 'opening',
    tags: ['source', 'chronology'],
    difficulty: 2,
    lessonId: 'lesson-08',
    formatId: 'source-what',
    officialSkillType: 'source-analysis',
    reasoningSteps: 2,
    distractorStrategy: '개항기 인접 정변·개혁',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 갑신정변',
        'https://encykorea.aks.ac.kr/',
        '갑신정변의 단기 집권·청 개입 사실 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-27',
    stem: '다음 자료와 관련된 조약 체결 이후의 전개로 옳은 것은?',
    stimulusType: 'document',
    stimulus: {
      kind: 'document',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 외부 관계 조항 요지',
      caption: '공식 조약문 인용이 아니라 외교권 위임 조항을 학습용으로 재구성한 자료이다.',
      altText:
        '한국이 외국과의 교섭을 일본에 위임하고, 일본이 파견한 관리가 서울에 상주하며 내정을 감독한다는 조항 요지.',
      body: '한국은 외국에 대한 교섭과 조약을 일본 정부에 위임한다. 일본 정부는 서울에 대표를 두어 한국의 내정을 감독할 수 있다.',
    },
    choices: [
      '통감부가 설치되어 내정 간섭이 강화되었다.',
      '한국 군대가 해산되고 정무가 통감 아래로 넘어갔다.',
      '사법권이 일본에 넘어갔다.',
      '국호가 바뀌고 총독부가 설치되었다.',
      '부산 등 특정 항구가 처음 개항되었다.',
    ],
    answerIndex: 0,
    explanation:
      '핵심 단서: 외교권 위임, 서울 상주 일본 대표의 내정 감독.\n정답 근거: 1905년 을사늑약의 내용이며, 이듬해 통감부가 설치되었다.\n오답: 군대 해산은 정미7조약, 사법권 이양은 기유각서, 총독부 설치는 한일병합, 개항은 강화도조약이다.\n연결 개념: 을사늑약, 통감부, 국권 피탈 단계.',
    era: 'colonial',
    tags: ['chronology', 'source'],
    difficulty: 2,
    lessonId: 'lesson-09',
    formatId: 'cause-effect',
    officialSkillType: 'source-analysis',
    reasoningSteps: 2,
    distractorStrategy: '국권 피탈 인접 조약',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 을사조약',
        'https://encykorea.aks.ac.kr/',
        '외교권 박탈과 통감부 설치의 전후 관계 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-52',
    stem: '다음 자료의 조치에 해당하는 고려의 제도로 옳은 것은?',
    stimulusType: 'document',
    stimulus: {
      kind: 'document',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 개경 체류 지시 요지',
      caption: '고려 왕실 문서 원문이 아니라 호족 견제 조치를 학습용으로 재구성한 자료이다.',
      altText:
        '지방 호족의 자제를 개경에 머물게 하고 출신지 일을 묻게 하여 지방 세력을 견제하라는 지시 요지.',
      body: '주현의 유력한 집 자제를 개경에 머물게 하라. 그 고을의 일을 물을 때 쓰게 하고, 지방의 세력이 제멋대로 커지지 않게 하라.',
    },
    choices: ['기인 제도', '사심관 제도', '음서 제도', '12목 설치', '전시과 제도'],
    answerIndex: 0,
    explanation:
      '핵심 단서: 호족 자제의 개경 체류, 출신지 자문, 지방 세력 견제.\n정답 근거: 태조의 기인 제도이다.\n오답: 사심관은 공신을 출신지 사심관으로 임명한다. 음서는 가문에 따른 관직 진출이다. 12목은 성종의 지방관 파견이다. 전시과는 관리에 대한 수조권 지급이다.\n연결 개념: 호족 견제, 사심관과의 구분, 고려 초 지방 통제.',
    era: 'goryeo',
    tags: ['political-system', 'source'],
    difficulty: 2,
    lessonId: 'lesson-12',
    formatId: 'policy-name',
    officialSkillType: 'source-analysis',
    reasoningSteps: 2,
    distractorStrategy: '같은 왕조 지방·신분 제도',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 기인',
        'https://encykorea.aks.ac.kr/',
        '기인·사심관의 정의 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-55',
    stem: '(가)~(다)를 일어난 순서대로 배열한 것은?',
    stimulusType: 'timeline',
    choiceOrder: 'keep',
    stimulus: {
      kind: 'timeline',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 국권 제약 조치 연표',
      caption: '연도는 가리지 않았다. 각 조치의 내용으로 순서를 판단한다.',
      altText:
        '(가) 외교 교섭을 일본에 위임하고 서울에 감독 기관을 두기로 한 조치, (나) 한국 군대를 해산한 조치, (다) 한국 황제의 통치권을 넘긴 조치.',
      events: [
        { marker: '(가)', text: '외교 교섭을 일본에 위임하고, 서울에 내정을 감독하는 기관을 두기로 하였다.' },
        { marker: '(나)', text: '한국 군대를 해산하고 정무를 통감의 지도 아래로 두었다.' },
        { marker: '(다)', text: '한국 황제의 통치권을 넘기고 병합이 공포되었다.' },
      ],
    },
    choices: [
      '(가) → (다) → (나)',
      '(나) → (가) → (다)',
      '(가) → (나) → (다)',
      '(다) → (나) → (가)',
      '(나) → (다) → (가)',
    ],
    answerIndex: 2,
    explanation:
      '핵심 단서: (가) 외교권 위임과 감독 기관, (나) 군대 해산, (다) 통치권 이양·병합.\n정답 근거: 을사늑약(1905) → 정미7조약(1907) → 한일병합(1910)이다.\n오답: (다)를 앞에 두면 병합이 외교권 박탈보다 앞선다. (나)를 처음에 두면 군대 해산이 을사보다 앞선다.\n연결 개념: 국권 피탈 3단계, 통감부.',
    era: 'colonial',
    tags: ['chronology'],
    difficulty: 3,
    lessonId: 'lesson-09',
    formatId: 'chronology-labeled',
    officialSkillType: 'chronology',
    reasoningSteps: 2,
    distractorStrategy: '인접 두 사건의 순서만 바꿈',
    provenance: provenance([
      source(
        '국사편찬위원회 우리역사넷 — 국권 피탈',
        'https://contents.history.go.kr/',
        '을사·정미·병합의 순서 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-57',
    stem: '다음 자료의 단체에 대한 설명으로 옳은 것은?',
    stimulusType: 'document',
    stimulus: {
      kind: 'document',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 임시정부 계열 활동 보고',
      caption: '판결문이나 신문 원문이 아니라 단체 활동을 학습용으로 재구성한 보고이다.',
      altText:
        '상하이에서 김구가 비밀 결사를 조직했고, 도쿄의 일왕 행렬과 상하이 공원 기념식에서 폭탄 의거가 이어졌다는 활동 보고.',
      body: '상하이에서 김구가 소수의 결사를 조직하였다. 이어 도쿄에서 일왕 행렬을 겨냥한 의거가 있었고, 상하이 공원 기념식에서도 폭탄이 터져 일본 고위 인사가 다쳤다.',
    },
    choices: [
      '이봉창·윤봉길의 의거로 일제 요인에 타격을 가하려 하였다.',
      '조선 혁명 선언을 바탕으로 의열 투쟁을 전개하였다.',
      '국내에서 좌우 합작의 민족 유일당 운동을 전개하였다.',
      '한글 맞춤법을 통일하고 사전 편찬을 추진하였다.',
      '국산품 애용을 내세워 경제적 실력 양성을 주장하였다.',
    ],
    answerIndex: 0,
    explanation:
      '핵심 단서: 김구가 상하이에서 조직한 결사, 도쿄 의거, 상하이 공원 의거.\n정답 근거: 한인애국단이며, 이봉창·윤봉길 의거가 대표 활동이다.\n오답: 조선 혁명 선언은 의열단, 민족 유일당은 신간회, 맞춤법·사전은 조선어학회, 국산품 애용은 물산 장려 운동이다.\n연결 개념: 한인애국단, 의열단과의 구분, 임시정부 노선.',
    era: 'colonial',
    tags: ['independence-org'],
    difficulty: 2,
    lessonId: 'lesson-09',
    formatId: 'org-activity',
    officialSkillType: 'source-analysis',
    reasoningSteps: 2,
    distractorStrategy: '같은 시기 독립운동 노선·단체',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 한인애국단',
        'https://encykorea.aks.ac.kr/',
        '김구·이봉창·윤봉길 활동 사실 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-70',
    stem: '다음 문화유산이 조성된 시기로 가장 적절한 것은?',
    stimulusType: 'catalog',
    stimulus: {
      kind: 'catalog',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 목판 대장경 목록 카드',
      caption: '문화재 사진이 아니라 판각 정보를 텍스트로 재구성한 학습 자료이다.',
      altText:
        '강화도로 천도한 뒤 호국 염원으로 불경을 판각했고, 8만여 장의 목판을 대장도감에서 만들었다는 목록 카드.',
      rows: [
        { label: '목적', value: '외침을 막고자 하는 호국 염원' },
        { label: '판각 장소', value: '강화도의 대장도감' },
        { label: '규모', value: '8만여 장의 목판 불경' },
        { label: '성격', value: '국가가 주도한 대규모 판각 사업' },
      ],
    },
    choices: ['고구려', '통일신라', '고려', '조선 전기', '개항기'],
    answerIndex: 2,
    explanation:
      '핵심 단서: 강화 천도 뒤의 호국 판각, 대장도감, 8만여 장 목판.\n정답 근거: 고려 고종 때의 재조대장경(팔만대장경)이다.\n오답: 고구려·통일신라에도 불경 사경이 있으나 강화 대장도감의 8만 목판은 고려이다. 조선 전기·개항기는 이 판각 사업의 시기가 아니다.\n연결 개념: 강화 천도, 팔만대장경, 초조대장경과의 구분.',
    era: 'culture',
    tags: ['cultural-heritage', 'source'],
    difficulty: 1,
    lessonId: 'lesson-11',
    formatId: 'heritage-period',
    officialSkillType: 'knowledge',
    reasoningSteps: 1,
    distractorStrategy: '같은 문화권의 인접 왕조',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 팔만대장경',
        'https://encykorea.aks.ac.kr/',
        '강화 대장도감 판각 시기 확인. 사진 미사용.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-86',
    stem: '(가)~(다)를 일어난 순서대로 배열한 것은?',
    stimulusType: 'timeline',
    choiceOrder: 'keep',
    stimulus: {
      kind: 'timeline',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 개항기 연표 조각',
      caption: '연도를 비워 사건의 내용으로 순서를 찾게 한 학습용 연표이다.',
      altText:
        '(가) 국호를 대한제국으로 바꾸고 황제 즉위를 선포, (나) 강화도에서 조일 수호 조규를 맺고 항구를 열음, (다) 신분제 폐지 등 제도 개혁을 추진.',
      events: [
        { marker: '(가)', text: '국호를 대한제국으로 바꾸고 황제 즉위가 선포되었다.' },
        { marker: '(나)', text: '강화도에서 조일 수호 조규가 체결되고 항구가 열렸다.' },
        { marker: '(다)', text: '신분제 폐지 등 제도 개혁이 추진되었다.' },
      ],
    },
    choices: [
      '(가) → (나) → (다)',
      '(나) → (다) → (가)',
      '(다) → (나) → (가)',
      '(나) → (가) → (다)',
      '(다) → (가) → (나)',
    ],
    answerIndex: 1,
    explanation:
      '핵심 단서: (나) 강화도 조약·개항, (다) 신분제 폐지 등 제도 개혁, (가) 대한제국·황제 즉위.\n정답 근거: 강화도조약(1876) → 갑오개혁(1894) → 대한제국 수립(1897)이다.\n오답: (가)를 앞에 두면 대한제국이 개항보다 앞선다. (다)를 처음에 두면 갑오가 강화도보다 앞선다.\n연결 개념: 강화도조약, 갑오개혁, 대한제국.',
    era: 'opening',
    tags: ['chronology', 'source'],
    difficulty: 3,
    lessonId: 'lesson-08',
    formatId: 'chronology-labeled',
    officialSkillType: 'chronology',
    reasoningSteps: 2,
    distractorStrategy: '앞뒤만 바뀐 배열',
    provenance: provenance([
      source(
        '국사편찬위원회 우리역사넷 — 개항과 개혁',
        'https://contents.history.go.kr/',
        '강화도·갑오·대한제국 순서 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-96',
    stem: '다음 활동을 전개한 단체로 옳은 것은?',
    stimulusType: 'document',
    stimulus: {
      kind: 'document',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 학회 사업 기록',
      caption: '신문 원문이나 정부 시기 기사가 아니라 학회 사업을 학습용으로 재구성한 기록이다.',
      altText:
        '한글 맞춤법을 통일하고 표준어를 정하며 우리말 큰사전을 편찬하려 했으나 치안 유지법으로 관련 인사가 탄압받았다는 학회 기록.',
      body: '한글 맞춤법의 통일안을 마련하고 표준어를 사정하였다. 우리말 큰사전 편찬을 이어 가던 중, 관련 인사들이 치안 유지법 위반으로 붙잡혔다.',
    },
    choices: ['조선어 학회', '조선어 연구회', '신간회', '진단학회', '물산 장려회'],
    answerIndex: 0,
    explanation:
      '핵심 단서: 한글 맞춤법 통일안, 표준어 사정, 우리말 큰사전, 치안 유지법 탄압.\n정답 근거: 조선어 학회의 사업과 조선어 학회 사건이다.\n오답: 조선어 연구회는 앞선 단계의 명칭으로 통일안·큰사전 단계와 구분한다. 신간회는 좌우 합작 민족 유일당, 진단학회는 역사 연구, 물산 장려회는 국산품 애용이다.\n연결 개념: 조선어 학회, 실력 양성·문화 운동, 치안 유지법.',
    era: 'colonial',
    tags: ['independence-org', 'source'],
    difficulty: 2,
    lessonId: 'lesson-17',
    formatId: 'source-who',
    officialSkillType: 'source-analysis',
    reasoningSteps: 2,
    distractorStrategy: '식민지기 문화·실력 양성 단체',
    provenance: provenance([
      source(
        '한국민족문화대백과 — 조선어학회',
        'https://encykorea.aks.ac.kr/',
        '맞춤법 통일안·큰사전·학회 사건 사실 확인.',
      ),
    ]),
  },
  {
    ...BATCH1_FIELDS,
    id: 'q-99',
    stem: '(가)와 (나) 시기의 통치 방식에 대한 설명으로 옳은 것은?',
    stimulusType: 'table',
    stimulus: {
      kind: 'table',
      authenticity: 'reconstructed',
      title: '학습용 재구성 · 식민 통치 비교표',
      caption: '공식 통계표가 아니라 두 시기의 정책을 학습용으로 재구성한 비교표이다.',
      altText:
        '(가)는 헌병 경찰과 회사 허가제, (나)는 보통 경찰 전환과 회사령 폐지, 배경은 병합 직후와 3·1운동 이후.',
      columns: ['구분', '(가)', '(나)'],
      table: [
        ['경찰', '헌병 경찰', '보통 경찰제로 전환'],
        ['회사', '설립에 허가제', '회사령 폐지 후 신고제'],
        ['배경', '병합 직후', '3·1운동 이후'],
      ],
    },
    choices: [
      '(나) 시기에는 이른바 문화 통치를 내세워 기만적 회유책을 병행하였다.',
      '(가) 시기에 헌병 경찰이 폐지되고 언론이 전면 자유화되었다.',
      '(나) 시기에 조선 총독부가 폐지되었다.',
      '(가)는 병합 이전에만 실시된 대한제국의 개혁이다.',
      '(나) 시기에는 치안 유지법이 폐지되고 독립이 허용되었다.',
    ],
    answerIndex: 0,
    explanation:
      '핵심 단서: (가) 헌병 경찰·회사 허가제·병합 직후, (나) 보통 경찰·회사령 폐지·3·1운동 이후.\n정답 근거: (가)는 무단 통치, (나)는 이른바 문화 통치이다. 회유와 기만적 허용이 함께 나타났다.\n오답: (가)에 헌병 경찰 폐지는 반대이다. 총독부 폐지·대한제국 개혁·독립 허용은 사실이 아니다.\n연결 개념: 무단 통치, 문화 통치, 회사령, 3·1운동.',
    era: 'colonial',
    tags: ['political-system', 'chronology'],
    difficulty: 2,
    lessonId: 'lesson-17',
    formatId: 'king-compare',
    officialSkillType: 'evaluation',
    reasoningSteps: 2,
    distractorStrategy: '식민 통치 인접 정책',
    provenance: provenance([
      source(
        '국사편찬위원회 우리역사넷 — 일제 식민 통치',
        'https://contents.history.go.kr/',
        '무단·문화 통치 전환의 정책 표지 확인.',
      ),
    ]),
  },
]

export function overlayBatch1Questions(list: Question[]): Question[] {
  const replacements = new Map(BATCH1_QUESTIONS.map((question) => [question.id, question]))
  return list.map((question) => replacements.get(question.id) ?? question)
}
