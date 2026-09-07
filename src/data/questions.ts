import type { Question } from '../types'

const META = {
  source: '자체 제작 학습문항',
  sourceUrl: '',
  license: '학습용 자체 제작',
  imageRights: '이미지 없음',
} as const

/**
 * 자체 제작 학습문항 (공식 기출 문장·이미지 미사용).
 *
 * 품질 원칙 (한능검 심화 감각):
 * 1) 오답은 ‘말도 안 되는 시대 섞기’가 아니라 인접 시대·유사 제도·혼동 인물로 구성
 * 2) 사료형은 지문을 베끼면 맞히는 구조 금지 — 단서로 추론하게 함
 * 3) 1점=필수 사실, 2점=표준 제도·인물 구분, 3점=순서·비교·함정 선지
 * 4) 선지 길이와 문체를 고르게 맞춤
 */
export const questions: Question[] = [
  // ─── 선사·고조선 ───
  {
    id: 'q-01',
    stem: '밑줄 친 ㉠ 시기의 사회상으로 가장 적절한 것은?',
    passage:
      '사람들은 강가나 바닷가에 자리를 잡고 살았으며, ㉠ 겉면에 기하학적 무늬를 새긴 토기를 사용하였다. 농경과 어로가 함께 이루어지고 움집 유적이 확인된다.',
    choices: [
      '비파형 동검이 권력의 상징으로 사용되고 고인돌이 축조되었다.',
      '철제 농기구와 철병이 보급되어 농업 생산력이 크게 높아졌다.',
      '빗살무늬토기를 사용하며 정착 생활과 초기 농경이 이루어졌다.',
      '명도전 등 화폐가 유통되고 중국과의 교역이 활발해졌다.',
      '율령을 반포하고 불교를 수용하여 중앙 집권을 강화하였다.',
    ],
    answerIndex: 2,
    explanation:
      '빗살무늬토기·움집·초기 농경은 신석기입니다. ①은 청동기, ②는 철기, ④·⑤는 초기 국가 이후의 모습입니다.',
    era: 'prehistoric',
    tags: ['source', 'chronology'],
    difficulty: 1,
    lessonId: 'lesson-01',
    ...META,
  },
  {
    id: 'q-02',
    stem: '다음 국가에 대한 설명으로 옳은 것은?',
    passage:
      '중국 군현과 대립·교류하며 성장하였고, 후기에 이르러 외부에서 들어온 세력이 왕위를 차지하였다. 사회 질서를 유지하기 위한 법령이 전해지며, 중계 무역으로 경제적 이득을 취하였다.',
    choices: [
      '골품제에 따라 관등 승진과 혼인이 제한되었다.',
      '고조선 후기에 중계 무역을 바탕으로 세력을 확대하였다.',
      '녹읍을 지급하여 귀족의 경제 기반을 보장하였다.',
      '기인 제도를 실시하여 지방 세력을 견제하였다.',
      '전시과를 시행하여 관료에게 토지 수조권을 지급하였다.',
    ],
    answerIndex: 1,
    explanation:
      '중계 무역·법령(8조법 전승)·후기 집권 세력은 고조선입니다. 선지에 인물명을 반복하지 않았습니다. 골품·녹읍은 신라, 기인·전시과는 고려입니다.',
    era: 'prehistoric',
    tags: ['king-figure', 'political-system', 'source'],
    difficulty: 2,
    lessonId: 'lesson-01',
    ...META,
  },
  {
    id: 'q-03',
    stem: '청동기 시대의 특징으로 옳지 않은 것은?',
    choices: [
      '비파형 동검이 제작·사용되었다.',
      '고인돌이 지배층의 무덤으로 축조되었다.',
      '군장 사회가 나타나고 빈부 격차가 커졌다.',
      '빗살무늬토기가 대표적인 토기로 널리 사용되었다.',
      '농경이 발달하고 정착 생활이 더욱 확대되었다.',
    ],
    answerIndex: 3,
    explanation:
      '빗살무늬토기는 신석기 표지 유물입니다. 청동기는 민무늬 토기·비파형동검·고인돌이 핵심입니다.',
    era: 'prehistoric',
    tags: ['chronology', 'cultural-heritage'],
    difficulty: 2,
    lessonId: 'lesson-01',
    ...META,
  },

  // ─── 삼국 ───
  {
    id: 'q-04',
    stem: '다음 왕이 누구인지 고른 것으로 옳은 것은?',
    passage:
      '남진 정책을 추진하여 한강 유역을 확보하고, 새로 편입한 지역을 순행하며 비를 세웠다. 불교를 공인한 선대의 정책을 이어받아 중앙 집권과 영토 확장을 동시에 추진하였다.',
    choices: ['근초고왕', '광개토대왕', '진흥왕', '장수왕', '법흥왕'],
    answerIndex: 2,
    explanation:
      '한강 확보·순수비는 신라 진흥왕입니다. 법흥왕은 불교 공인, 장수왕은 평양 천도, 광개토대왕은 고구려 정복 군주입니다.',
    era: 'three-kingdoms',
    tags: ['king-figure', 'source'],
    difficulty: 2,
    lessonId: 'lesson-02',
    ...META,
  },
  {
    id: 'q-05',
    stem: '(가)~(다)를 일어난 순서대로 배열한 것은?',
    passage:
      '(가) 장수왕이 평양으로 천도하였다.\n(나) 광개토대왕이 정복 전쟁을 통해 영토를 크게 넓혔다.\n(다) 소수림왕이 불교를 수용하고 율령을 반포하였다.',
    choices: [
      '(가) → (나) → (다)',
      '(나) → (다) → (가)',
      '(다) → (나) → (가)',
      '(다) → (가) → (나)',
      '(나) → (가) → (다)',
    ],
    answerIndex: 2,
    explanation:
      '소수림왕(율령·불교) → 광개토대왕(정복) → 장수왕(평양 천도) 순입니다.',
    era: 'three-kingdoms',
    tags: ['chronology', 'king-figure'],
    difficulty: 3,
    lessonId: 'lesson-02',
    ...META,
  },
  {
    id: 'q-06',
    stem: '백제 근초고왕 대의 상황으로 가장 적절한 것은?',
    choices: [
      '사비로 천도하고 미륵사 창건을 추진하였다.',
      '마한 세력을 통합하며 전성기를 이루고 고구려와 대립하였다.',
      '나·당 연합군에 맞서 황산벌에서 결전을 벌였다.',
      '웅진으로 천도하여 국난을 수습하려 하였다.',
      '한강 유역을 빼앗긴 뒤 신라와 동맹을 맺었다.',
    ],
    answerIndex: 1,
    explanation:
      '근초고왕 대는 마한 통합·전성기·고구려와의 충돌이 핵심입니다. 사비·미륵은 후기, 웅진 천도는 한성 함락 이후, 황산벌은 계백입니다.',
    era: 'three-kingdoms',
    tags: ['king-figure'],
    difficulty: 2,
    lessonId: 'lesson-02',
    ...META,
  },
  {
    id: 'q-07',
    stem: '신라의 발전과 관련된 설명으로 옳은 것은?',
    choices: [
      '법흥왕 때 불교가 공인되고 공복·율령 정비의 기틀이 마련되었다.',
      '진흥왕 때 골품제가 폐지되고 누구나 고위 관직에 오를 수 있었다.',
      '법흥왕 때 한강 유역을 확보하고 순수비를 세웠다.',
      '진흥왕 때 나·당 동맹을 맺어 고구려를 멸망시켰다.',
      '문무왕 때 이차돈의 순교를 계기로 불교가 공인되었다.',
    ],
    answerIndex: 0,
    explanation:
      '불교 공인은 법흥왕, 한강·순수비는 진흥왕입니다. 골품제는 폐지되지 않았고, 나·당 동맹·백제·고구려 멸망은 7세기입니다.',
    era: 'three-kingdoms',
    tags: ['king-figure', 'political-system'],
    difficulty: 3,
    lessonId: 'lesson-02',
    ...META,
  },

  // ─── 남북국 ───
  {
    id: 'q-08',
    stem: '통일신라의 사회·경제에 대한 설명으로 옳은 것은?',
    choices: [
      '녹읍이 부활하여 귀족의 경제 기반이 강화되는 측면이 있었다.',
      '전시과를 실시하여 관료에게 수조지를 지급하였다.',
      '기인 제도로 호족의 자제를 개경에 머물게 하였다.',
      '과전법을 시행하여 관리에게 수조권을 주었다.',
      '대동법으로 공물을 미·포로 납부하게 하였다.',
    ],
    answerIndex: 0,
    explanation:
      '통일신라의 녹읍 부활이 핵심입니다. 전시과·기인은 고려, 과전법은 조선 초, 대동법은 조선 후기입니다.',
    era: 'north-south',
    tags: ['political-system'],
    difficulty: 3,
    lessonId: 'lesson-03',
    ...META,
  },
  {
    id: 'q-09',
    stem: '다음 국가를 세운 인물로 옳은 것은?',
    passage:
      '고구려 유민을 중심으로 건국되어 당과 대립·교류하였다. 전성기에는 해동성국으로 불리며 독자적인 문화를 발전시켰다.',
    choices: ['견훤', '궁예', '대조영', '왕건', '문무왕'],
    answerIndex: 2,
    explanation:
      '발해 건국자는 대조영입니다. 견훤·궁예·왕건은 후삼국, 문무왕은 통일신라입니다.',
    era: 'north-south',
    tags: ['king-figure', 'source'],
    difficulty: 1,
    lessonId: 'lesson-03',
    ...META,
  },
  {
    id: 'q-10',
    stem: '남북국 시대의 흐름을 시기순으로 바르게 나열한 것은?',
    choices: [
      '발해 건국 → 신라의 삼국 통일 → 후삼국 성립',
      '신라의 삼국 통일 → 발해 건국 → 후삼국 성립',
      '후삼국 성립 → 신라의 삼국 통일 → 발해 건국',
      '발해 건국 → 후삼국 성립 → 신라의 삼국 통일',
      '후삼국 성립 → 발해 건국 → 신라의 삼국 통일',
    ],
    answerIndex: 1,
    explanation:
      '668년 전후 통일 흐름 → 698년 발해 건국 → 9세기 말~10세기 초 후삼국입니다.',
    era: 'north-south',
    tags: ['chronology'],
    difficulty: 2,
    lessonId: 'lesson-03',
    ...META,
  },

  // ─── 고려 ───
  {
    id: 'q-11',
    stem: '다음 정책을 추진한 왕으로 옳은 것은?',
    passage:
      '불법적으로 노비가 된 자를 조사하여 양인으로 돌리고, 시험을 통해 신진 관료를 등용하였으며, 관리의 복색을 정하였다. 이를 통해 호족을 억누르고 왕권을 강화하려 하였다.',
    choices: ['태조', '광종', '성종', '예종', '공민왕'],
    answerIndex: 1,
    explanation:
      '노비 신분 조사·과거·공복은 광종의 왕권 강화 정책입니다. 성종은 시무 28조·12목, 공민왕은 전민변정도감 등으로 구분합니다.',
    era: 'goryeo',
    tags: ['king-figure', 'political-system', 'source'],
    difficulty: 2,
    lessonId: 'lesson-04',
    ...META,
  },
  {
    id: 'q-12',
    stem: '고려 성종 대의 정치에 대한 설명으로 옳은 것은?',
    choices: [
      '최승로의 건의를 받아들여 유교적 정치 이념을 강화하였다.',
      '노비안검법을 실시하여 호족의 경제력을 약화시켰다.',
      '정방을 통해 관리 임면을 좌우하였다.',
      '무신들이 경종을 폐위하고 권력을 장악하였다.',
      '강화도로 도읍을 옮겨 장기 항전을 준비하였다.',
    ],
    answerIndex: 0,
    explanation:
      '성종=최승로 시무 28조·유교 정치·12목입니다. 노비안검은 광종, 정방·강화 천도는 무신·대몽기입니다.',
    era: 'goryeo',
    tags: ['king-figure', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-04',
    ...META,
  },
  {
    id: 'q-13',
    stem: '광종과 성종의 정책을 비교한 것으로 가장 적절한 것은?',
    choices: [
      '광종은 유교 정치 정비, 성종은 호족 경제력 강화에 주력하였다.',
      '광종은 왕권 강화, 성종은 유교적 통치 질서와 지방 제도 정비에 힘을 쏟았다.',
      '광종은 12목을 설치하고, 성종은 과거제를 처음 도입하였다.',
      '두 왕 모두 정방을 설치하여 인사권을 장악하였다.',
      '두 왕 모두 강화 천도를 단행하여 대몽 항쟁을 준비하였다.',
    ],
    answerIndex: 1,
    explanation:
      '광종=왕권(노비안검·과거·공복), 성종=유교 정치·지방제도(시무28조·12목). ③은 서로 뒤바뀐 함정입니다.',
    era: 'goryeo',
    tags: ['king-figure', 'political-system'],
    difficulty: 3,
    lessonId: 'lesson-04',
    ...META,
  },
  {
    id: 'q-14',
    stem: '(가)~(다) 사건을 일어난 순서대로 배열한 것은?',
    passage:
      '(가) 삼별초가 개경 환도에 반대하여 항쟁하였다.\n(나) 무신들이 정변을 일으켜 정권을 장악하였다.\n(다) 몽골의 침입에 대응하여 강화로 천도하였다.',
    choices: [
      '(다) → (나) → (가)',
      '(나) → (다) → (가)',
      '(가) → (나) → (다)',
      '(나) → (가) → (다)',
      '(다) → (가) → (나)',
    ],
    answerIndex: 1,
    explanation:
      '1170 무신 정변 → 1232 강화 천도 → 개경 환도 반대 삼별초 항쟁입니다.',
    era: 'goryeo',
    tags: ['chronology', 'source'],
    difficulty: 3,
    lessonId: 'lesson-05',
    ...META,
  },
  {
    id: 'q-15',
    stem: '삼별초에 대한 설명으로 옳은 것은?',
    choices: [
      '개경 환도 결정에 반대하여 항쟁을 계속하였다.',
      '최충헌이 설치한 정비된 문벌 귀족의 회의체였다.',
      '공민왕이 권문세족을 타도하기 위해 창설하였다.',
      '이자겸의 난을 진압하기 위해 조직된 금군이었다.',
      '묘청의 서경 천도 운동을 지지한 승병 조직이었다.',
    ],
    answerIndex: 0,
    explanation:
      '삼별초는 대몽 항쟁 군사로, 개경 환도 반대 항쟁이 핵심입니다. 나머지 선택지는 고려 다른 사건·세력입니다.',
    era: 'goryeo',
    tags: ['chronology', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-05',
    ...META,
  },
  {
    id: 'q-16',
    stem: '다음 인물로 알맞은 것은?',
    passage: '성종에게 시무책을 올려 유교적 정치 이념과 제도 정비를 건의하였다.',
    choices: ['정중부', '최승로', '최충헌', '묘청', '이자겸'],
    answerIndex: 1,
    explanation:
      '성종에게 시무 28조를 올린 인물은 최승로입니다. 정중부·최충헌은 무신, 묘청·이자겸은 다른 정치 세력입니다.',
    era: 'goryeo',
    tags: ['king-figure', 'source'],
    difficulty: 2,
    lessonId: 'lesson-04',
    ...META,
  },
  {
    id: 'q-17',
    stem: '왕과 업적의 연결이 바른 것은?',
    choices: [
      '광종 — 노비안검법 / 성종 — 12목 설치',
      '광종 — 12목 설치 / 성종 — 노비안검법',
      '광종 — 정방 설치 / 성종 — 기인 제도',
      '광종 — 강화 천도 / 성종 — 삼별초 항쟁',
      '광종 — 서경 천도 / 성종 — 묘청의 난 진압',
    ],
    answerIndex: 0,
    explanation:
      '광종=노비안검·과거·공복, 성종=시무28조·12목입니다. ①과 ②처럼 뒤바꾼 선지가 변별의 핵심입니다.',
    era: 'goryeo',
    tags: ['king-figure'],
    difficulty: 3,
    lessonId: 'lesson-04',
    ...META,
  },

  // ─── 조선 전기 ───
  {
    id: 'q-18',
    stem: '조선 태종의 정책으로 옳은 것은?',
    choices: [
      '사병을 혁파하고 호패법을 실시하여 왕권을 강화하였다.',
      '집현전을 설치하고 훈민정음을 창제하였다.',
      '경국대전을 처음 구상하여 법전 편찬을 시작하였다.',
      '대동법을 경기도부터 시행하였다.',
      '비변사를 임시 기구에서 상설 기구로 확대하였다.',
    ],
    answerIndex: 0,
    explanation:
      '태종=사병 혁파·호패법입니다. 집현전·훈민정음은 세종, 대동법은 조선 후기, 비변사 상설화는 중·후기입니다.',
    era: 'joseon-early',
    tags: ['king-figure', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-06',
    ...META,
  },
  {
    id: 'q-19',
    stem: '다음 업적을 남긴 왕으로 옳은 것은?',
    passage:
      '학문 연구 기관을 두어 인재를 키우고, 백성이 쉽게 배울 수 있는 문자를 만들어 반포하였다. 천문·역법·의학 등 실용 학문에도 힘을 기울였다.',
    choices: ['태종', '세종', '세조', '성종', '광해군'],
    answerIndex: 1,
    explanation:
      '집현전·훈민정음·과학 진흥은 세종입니다. 성종은 경국대전 완성 등으로 구분합니다.',
    era: 'joseon-early',
    tags: ['king-figure', 'cultural-heritage', 'source'],
    difficulty: 1,
    lessonId: 'lesson-06',
    ...META,
  },
  {
    id: 'q-20',
    stem: '경국대전에 대한 설명으로 가장 적절한 것은?',
    choices: [
      '조선의 통치 규범을 종합적으로 정리한 법전이다.',
      '고려 성종이 유교 정치를 위해 편찬한 예서이다.',
      '갑오개혁 때 제정된 근대적 민법전이다.',
      '대한제국이 선포한 헌법이다.',
      '발해의 지방 통치 규정을 모은 법전이다.',
    ],
    answerIndex: 0,
    explanation:
      '경국대전은 조선 전기에 편찬·완성된 통치 법전입니다. 인접 오답도 ‘법전·규범’ 계열로 두어 단순 시대 배제를 줄였습니다.',
    era: 'joseon-early',
    tags: ['political-system'],
    difficulty: 2,
    lessonId: 'lesson-06',
    ...META,
  },

  // ─── 조선 후기 ───
  {
    id: 'q-21',
    stem: '대동법에 대한 설명으로 옳은 것은?',
    choices: [
      '공물을 특산물 대신 미·포 등으로 납부하게 하여 방납의 폐단을 줄이려 하였다.',
      '군포를 1필로 줄이고 부족한 재원을 결작 등으로 보충하였다.',
      '관리에게 수조권을 지급하는 과전을 지급하였다.',
      '노비 신분을 일괄 해방하여 양인으로 편입하였다.',
      '서원을 철폐하고 향약을 전국에 의무화하였다.',
    ],
    answerIndex: 0,
    explanation:
      '대동법=공납 개혁입니다. ①과 ②(균역법)를 구분하는 것이 핵심 변별 포인트입니다.',
    era: 'joseon-late',
    tags: ['political-system'],
    difficulty: 2,
    lessonId: 'lesson-07',
    ...META,
  },
  {
    id: 'q-22',
    stem: '조선 후기 사회 변동을 시기순에 가깝게 배열한 것은?',
    choices: [
      '세도 정치 → 대동법 시행 → 실학의 등장',
      '대동법의 확대 → 실학의 발달 → 세도 정치와 농민 봉기',
      '균역법 → 임진왜란 → 대동법',
      '실학 → 경국대전 완성 → 대동법',
      '홍경래의 난 → 대동법 → 병자호란',
    ],
    answerIndex: 1,
    explanation:
      '대동법 확대·실학 발달이 이어지고, 19세기 세도 정치와 농민 봉기로 모순이 표출됩니다.',
    era: 'joseon-late',
    tags: ['chronology'],
    difficulty: 3,
    lessonId: 'lesson-07',
    ...META,
  },
  {
    id: 'q-23',
    stem: '균역법에 대한 설명으로 옳은 것은?',
    choices: [
      '공물을 미·포로 납부하게 한 제도이다.',
      '양인의 군포 부담을 줄이고 부족한 재원을 다른 방식으로 보충하려 한 제도이다.',
      '관리에게 토지 수조권을 지급한 제도이다.',
      '노비안검을 통해 양인 인구를 늘리려 한 제도이다.',
      '서얼의 관직 진출을 전면 허용한 제도이다.',
    ],
    answerIndex: 1,
    explanation:
      '균역법=군포 경감입니다. 공납 개혁인 대동법과 혼동하지 않아야 합니다.',
    era: 'joseon-late',
    tags: ['political-system'],
    difficulty: 2,
    lessonId: 'lesson-07',
    ...META,
  },

  // ─── 개항기 ───
  {
    id: 'q-24',
    stem: '다음 설명이 가리키는 사건으로 옳은 것은?',
    passage:
      '급진 개화파가 짧은 기간 정권을 장악하고 개혁을 시도하였으나, 청의 개입 등으로 실패하였고 주동 세력 다수가 망명하였다.',
    choices: ['임오군란', '갑신정변', '갑오개혁', '아관파천', '독립협회 해산'],
    answerIndex: 1,
    explanation:
      '단기 집권·급진 개화파·청 개입 실패는 갑신정변입니다. 임오군란·갑오개혁과 구분해야 합니다.',
    era: 'opening',
    tags: ['source', 'chronology'],
    difficulty: 2,
    lessonId: 'lesson-08',
    ...META,
  },
  {
    id: 'q-25',
    stem: '개항기 주요 사건을 시기순으로 바르게 나열한 것은?',
    choices: [
      '갑오개혁 → 강화도조약 → 대한제국 수립',
      '강화도조약 → 갑신정변 → 갑오개혁 → 대한제국 수립',
      '대한제국 수립 → 강화도조약 → 갑신정변',
      '갑신정변 → 강화도조약 → 갑오개혁',
      '갑오개혁 → 갑신정변 → 강화도조약',
    ],
    answerIndex: 1,
    explanation:
      '1876 강화도조약 → 1884 갑신 → 1894 갑오 → 1897 대한제국입니다.',
    era: 'opening',
    tags: ['chronology'],
    difficulty: 3,
    lessonId: 'lesson-08',
    ...META,
  },
  {
    id: 'q-26',
    stem: '독립협회의 활동으로 적절한 것은?',
    choices: [
      '만민공동회를 열어 민권과 참정 논의를 확산시켰다.',
      '홍범 14조를 제정하여 개혁의 방향을 제시하였다.',
      '집강소를 설치하여 폐정 개혁을 추진하였다.',
      '대한국 국제를 반포하여 황제권을 명문화하였다.',
      '치안유지법을 제정하여 사회운동을 탄압하였다.',
    ],
    answerIndex: 0,
    explanation:
      '독립협회=만민공동회·민권 운동입니다. 홍범 14조·집강소·대한국 국제는 각각 갑오·동학·대한제국, 치안유지법은 일제입니다.',
    era: 'opening',
    tags: ['independence-org', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-08',
    ...META,
  },

  // ─── 일제강점 ───
  {
    id: 'q-27',
    stem: '을사늑약 이후의 상황으로 옳은 것은?',
    choices: [
      '외교권을 빼앗기는 등 국권 침해가 가속화되었다.',
      '통감부가 폐지되고 대한제국의 자주 외교가 회복되었다.',
      '갑오개혁이 시작되어 신분제가 법적으로 폐지되었다.',
      '강화도조약으로 부산·원산·인천이 개항되었다.',
      '독립협회가 설립되어 독립문 건립을 추진하였다.',
    ],
    answerIndex: 0,
    explanation:
      '을사늑약(1905)=외교권 박탈입니다. 나머지는 시기나 내용이 맞지 않습니다.',
    era: 'colonial',
    tags: ['chronology', 'source'],
    difficulty: 1,
    lessonId: 'lesson-09',
    ...META,
  },
  {
    id: 'q-28',
    stem: '3·1운동의 영향으로 가장 적절한 것은?',
    choices: [
      '공화제를 지향하는 임시정부 수립 움직임이 본격화되었다.',
      '무단 통치가 강화되고 헌병 경찰제가 처음 도입되었다.',
      '회사령이 제정되어 한국인 기업 설립이 전면 금지되었다.',
      '을사늑약이 체결되어 외교권이 박탈되었다.',
      '갑신정변으로 급진 개화파가 정권을 잡았다.',
    ],
    answerIndex: 0,
    explanation:
      '3·1운동 이후 임시정부 수립이 본격화되었습니다. 무단 통치·회사령은 그 이전/다른 맥락입니다.',
    era: 'colonial',
    tags: ['independence-org', 'chronology'],
    difficulty: 2,
    lessonId: 'lesson-09',
    ...META,
  },
  {
    id: 'q-29',
    stem: '의열단의 활동 성격으로 옳은 것은?',
    choices: [
      '일제 고관과 식민 통치 기구를 겨냥한 의열 투쟁을 전개하였다.',
      '국내에서 실력 양성을 내걸고 교육·산업 운동에만 집중하였다.',
      '파리 강화 회의에 대표를 파견하여 독립을 청원하였다.',
      '조선어 학회를 조직하여 국어 사전 편찬을 주도하였다.',
      '대한광복회를 계승하여 의병 전쟁을 재개하였다.',
    ],
    answerIndex: 0,
    explanation:
      '의열단=의열 투쟁입니다. 실력 양성·외교 독립·조선어 학회 등은 다른 노선·단체입니다.',
    era: 'colonial',
    tags: ['independence-org'],
    difficulty: 2,
    lessonId: 'lesson-09',
    ...META,
  },
  {
    id: 'q-30',
    stem: '대한민국 임시정부에 대한 설명으로 옳은 것은?',
    choices: [
      '민주 공화제를 지향하며 독립운동을 지도하려 하였다.',
      '대한제국의 황실을 복원하여 군주정을 유지하려 하였다.',
      '일제의 문화 통치에 협력하는 자치 기구였다.',
      '갑오개혁을 주도한 개화파 정부의 후신이다.',
      '만민공동회를 상설화한 독립협회의 후신이다.',
    ],
    answerIndex: 0,
    explanation:
      '임시정부는 공화제 이념 아래 독립운동을 지도하려 한 정부입니다.',
    era: 'colonial',
    tags: ['independence-org', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-09',
    ...META,
  },

  // ─── 현대 ───
  {
    id: 'q-31',
    stem: '광복 이후 사건을 시기순으로 배열한 것으로 옳은 것은?',
    choices: [
      '6·25전쟁 → 정부 수립 → 4·19혁명',
      '정부 수립 → 6·25전쟁 → 4·19혁명',
      '4·19혁명 → 정부 수립 → 6·25전쟁',
      '정부 수립 → 4·19혁명 → 6·25전쟁',
      '6·25전쟁 → 4·19혁명 → 정부 수립',
    ],
    answerIndex: 1,
    explanation: '1948 정부 수립 → 1950 전쟁 → 1960 4·19입니다.',
    era: 'modern',
    tags: ['chronology'],
    difficulty: 2,
    lessonId: 'lesson-10',
    ...META,
  },
  {
    id: 'q-32',
    stem: '1987년 6월 민주 항쟁의 결과로 적절한 것은?',
    choices: [
      '대통령 직선제 개헌 등 민주화 조치가 이루어졌다.',
      '반민특위가 구성되어 친일파 청산에 나섰다.',
      '제헌 국회가 구성되고 제헌 헌법이 제정되었다.',
      '정전 협정이 체결되어 전쟁이 중단되었다.',
      '신군부가 비상계엄을 전국으로 확대하였다.',
    ],
    answerIndex: 0,
    explanation:
      '6월 항쟁=직선제 개헌입니다. 반민특위·제헌·정전·비상계엄 확대는 다른 시점입니다.',
    era: 'modern',
    tags: ['political-system', 'chronology'],
    difficulty: 1,
    lessonId: 'lesson-10',
    ...META,
  },
  {
    id: 'q-33',
    stem: '5·18 민주화 운동에 대한 설명으로 옳은 것은?',
    choices: [
      '신군부 집권 과정에 저항한 시민·학생의 민주화 운동이다.',
      '이승만 정권의 부정선거에 항의하여 일어났다.',
      '박정희 정권의 한일협정 비준에 반대하여 일어났다.',
      '유신체제 성립에 항의하여 전국적으로 확산되었다.',
      '전두환 정권의 호헌 조치에 반대하여 직선제를 요구하였다.',
    ],
    answerIndex: 0,
    explanation:
      '5·18은 1980년 광주 민주화 운동입니다. ④·⑤는 각각 유신·6월 항쟁과 혼동하기 쉬운 함정입니다.',
    era: 'modern',
    tags: ['chronology', 'source'],
    difficulty: 2,
    lessonId: 'lesson-10',
    ...META,
  },

  // ─── 문화사 ───
  {
    id: 'q-34',
    stem: '다음 문화유산이 조성된 시기로 가장 적절한 것은?',
    passage: '불국사와 석굴암으로 대표되는 불교 건축·조각이 높은 예술적 수준을 보여 주었다.',
    choices: ['고구려', '백제', '통일신라', '고려', '조선'],
    answerIndex: 2,
    explanation:
      '불국사·석굴암은 통일신라 불교 미술의 대표작입니다. 선택지를 삼국~조선으로 좁혀 변별력을 높였습니다.',
    era: 'culture',
    tags: ['cultural-heritage', 'source'],
    difficulty: 1,
    lessonId: 'lesson-11',
    ...META,
  },
  {
    id: 'q-35',
    stem: '팔만대장경에 대한 설명으로 옳은 것은?',
    choices: [
      '고려 시대에 조성되었으며 호국 불교의 염원과 연결되어 이해된다.',
      '통일신라가 황룡사 구층목탑과 함께 조성한 목판 경전이다.',
      '세종 때 집현전에서 금속활자로 간행한 불경이다.',
      '발해가 상경성에 보관하기 위해 판각한 경전이다.',
      '조선 후기 실학자들이 편찬한 백과사전이다.',
    ],
    answerIndex: 0,
    explanation:
      '고려대장경(팔만대장경)은 고려 시대 판각입니다. 직지·훈민정음·실학 서적과 구분합니다.',
    era: 'culture',
    tags: ['cultural-heritage'],
    difficulty: 2,
    lessonId: 'lesson-11',
    ...META,
  },
  {
    id: 'q-36',
    stem: '훈민정음에 대한 설명으로 적절한 것은?',
    choices: [
      '세종이 창제·반포하여 백성의 문자 생활을 돕으려 하였다.',
      '최치원이 유교 경전 학습을 위해 만든 이두 표기법이다.',
      '광종이 과거 시행을 위해 제정한 공용 문자이다.',
      '실학자들이 서양 과학 서적 번역을 위해 만든 표기법이다.',
      '독립협회가 민중 계몽을 위해 보급한 속기체이다.',
    ],
    answerIndex: 0,
    explanation: '훈민정음은 세종대 창제·반포입니다.',
    era: 'culture',
    tags: ['cultural-heritage', 'king-figure'],
    difficulty: 1,
    lessonId: 'lesson-11',
    ...META,
  },
  {
    id: 'q-37',
    stem: '수원 화성의 성격으로 옳은 것은?',
    choices: [
      '정조 대에 건설된 계획도시·성곽으로 실학적 기술과 방어 기능이 반영되었다.',
      '고구려가 국내성 방어를 위해 축조한 산성이다.',
      '통일신라가 한강 유역 방어를 위해 쌓은 산성이다.',
      '고려가 강화 천도기 임시 도읍으로 건설한 성이다.',
      '일제가 식민 통치를 위해 세운 근대식 요새이다.',
    ],
    answerIndex: 0,
    explanation:
      '수원 화성은 조선 후기 정조 대의 성곽 도시입니다. 오답도 ‘성곽·도읍’ 계열로 구성했습니다.',
    era: 'culture',
    tags: ['cultural-heritage', 'political-system'],
    difficulty: 2,
    lessonId: 'lesson-11',
    ...META,
  },

  // ─── 통합·변별 강화 ───
  {
    id: 'q-38',
    stem: '밑줄 친 ㉠ 제도의 명칭으로 옳은 것은?',
    passage:
      '정부는 공납의 폐단을 줄이기 위해 ㉠ 을/를 확대 시행하였다. 각 지역의 특산물 대신 미·포 등을 거두어 필요한 물품을 마련하도록 하였다.',
    choices: ['과전법', '대동법', '균역법', '기인 제도', '노비안검법'],
    answerIndex: 1,
    explanation:
      '특산물 공납을 미·포로 바꾼 것은 대동법입니다. 균역법은 군포 경감, 과전법은 수조권 지급입니다.',
    era: 'joseon-late',
    tags: ['political-system', 'source'],
    difficulty: 2,
    lessonId: 'lesson-07',
    ...META,
  },
  {
    id: 'q-39',
    stem: '다음 중 사건 순서가 바른 것은?',
    choices: [
      '법흥왕 불교 공인 → 진흥왕 영토 확장 → 문무왕대 삼국 통일 흐름',
      '진흥왕 영토 확장 → 법흥왕 불교 공인 → 문무왕대 통일',
      '문무왕대 통일 → 법흥왕 불교 공인 → 진흥왕 영토 확장',
      '진흥왕 영토 확장 → 문무왕대 통일 → 법흥왕 불교 공인',
      '법흥왕 불교 공인 → 문무왕대 통일 → 진흥왕 영토 확장',
    ],
    answerIndex: 0,
    explanation:
      '법흥왕 → 진흥왕 → 문무왕(통일 전쟁) 순입니다. 인접 왕대만으로 선지를 구성해 변별력을 높였습니다.',
    era: 'three-kingdoms',
    tags: ['chronology', 'king-figure'],
    difficulty: 3,
    lessonId: 'lesson-02',
    ...META,
  },
  {
    id: 'q-40',
    stem: '(가) 인물로 알맞은 것은?',
    passage:
      '(가)은/는 호족을 억누르기 위해 노비 신분을 조사하고, 시험을 통해 관리를 뽑았으며, 관리의 복식을 정하였다.',
    choices: ['태조', '광종', '성종', '인종', '공민왕'],
    answerIndex: 1,
    explanation:
      '노비 신분 조사·과거·공복은 광종입니다. 성종은 12목·시무 28조, 공민왕은 반원 개혁과 전민변정도감으로 구분합니다.',
    era: 'goryeo',
    tags: ['king-figure', 'political-system', 'source'],
    difficulty: 2,
    lessonId: 'lesson-04',
    ...META,
  },
]

export function difficultyDistribution(list: Question[] = questions) {
  const counts = { 1: 0, 2: 0, 3: 0 }
  for (const q of list) counts[q.difficulty] += 1
  return counts
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id)
}

/** 품질 점검용: 선지 수·정답 인덱스·중복 선지·지문 복붙형 */
export function validateQuestionBank(list: Question[] = questions): string[] {
  const errors: string[] = []
  for (const q of list) {
    if (q.choices.length !== 5) errors.push(`${q.id}: choices must be 5`)
    if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) {
      errors.push(`${q.id}: invalid answerIndex`)
    }
    const normalized = q.choices.map((c) => c.replace(/\s+/g, ''))
    if (new Set(normalized).size !== normalized.length) {
      errors.push(`${q.id}: duplicate choices`)
    }
    const passage = (q.passage ?? '').replace(/\s+/g, '')
    const answer = q.choices[q.answerIndex]?.replace(/\s+/g, '') ?? ''
    if (passage && answer.length >= 8) {
      // 정답 문장 상당 부분이 지문에 그대로 있으면 복붙형으로 간주
      const chunks = [answer.slice(0, Math.min(12, answer.length))]
      if (answer.length > 16) chunks.push(answer.slice(8, 20))
      if (chunks.some((c) => c.length >= 8 && passage.includes(c))) {
        errors.push(`${q.id}: answer appears copied from passage`)
      }
    }
  }
  return errors
}
