import type { LessonGuide } from '../types'

/** Original learning explanations. Source checks are separate from expert exam approval. */
export const lessonGuides: LessonGuide[] = [
  {
    lessonId: 'lesson-01',
    contentVersion: 2,
    reviewStatus: 'source-checked',
    checkedAt: '2026-09-11',
    introduction:
      '생활 도구와 생산 방식이 어떻게 달라졌는지 먼저 이해하고, 그 변화 속에서 고조선의 성립과 사회 모습을 연결해 봅니다. 아래 설명은 우리역사넷(국사편찬위원회) 교과서 자료를 대조한 학습용 정리이며, 전문가 시험 승인 상태는 아닙니다.',
    sections: [
      {
        conceptId: 't-pre-01',
        title: '구석기와 신석기: 생활 방식이 달라지다',
        paragraphs: [
          '구석기 사람들은 뗀석기를 사용하며 사냥과 채집을 했고, 계절에 따라 이동했습니다. 신석기(기원전 8000년경부터)에는 간석기·뼈 도구와 함께 빗살무늬토기가 널리 쓰였고, 강가나 바닷가에 자리 잡아 움집에서 살며 농경·목축을 시작하면서 정착 생활이 발달했습니다. 사냥과 어로가 사라진 것은 아닙니다.',
          '지문에 빗살무늬(기하 무늬) 토기·움집·초기 농경·어로가 함께 나오면 신석기를 떠올리세요. 「농경」이라는 말만으로 시대를 결정하지 말고, 어떤 유물과 생활 모습이 함께 제시됐는지 확인합니다. 구석기의 뗀석기·이동 생활과 대비하면 정답이 더 분명해집니다.',
        ],
        recallPrompt: '구석기와 신석기의 차이를 도구와 생활 방식에서 각각 하나씩 말해 보세요.',
        expectedElements: ['뗀석기와 간석기·빗살무늬토기', '이동 생활과 농경·움집 정착의 발달'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0020_0010',
      },
      {
        conceptId: 't-pre-02',
        title: '청동기: 생산의 성장과 지배층의 등장',
        paragraphs: [
          '청동기는 만들기가 어렵고 재료도 충분하지 않아 지배층의 무기·장식품으로 쓰였고, 생활 도구의 대부분은 돌·나무로 만든 것이었습니다. 민무늬 토기가 대표적이며, 비파형 동검은 청동기 문화를 읽는 유물입니다. 농경이 더욱 발달하면서 재산 차이와 군장(족장) 사회가 나타났습니다.',
          '많은 노동이 필요한 고인돌은 지배층의 존재를 읽는 단서입니다. 민무늬 토기를 신석기의 빗살무늬토기와 비교해 두세요. 「청동기가 나왔다」는 것만으로 모든 생활 도구가 청동으로 바뀌었다고 읽지 마세요.',
        ],
        recallPrompt: '고인돌이 지배층의 존재를 보여 주는 이유와 청동기 시대에도 쓰인 생활 도구를 설명해 보세요.',
        expectedElements: ['큰 무덤을 만드는 노동력을 동원할 수 있는 지배층', '돌·나무 도구도 계속 사용', '민무늬 토기·비파형 동검'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0030',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0010',
        ],
      },
      {
        conceptId: 't-pre-07',
        title: '철기: 농기구와 무기로 활용되다',
        paragraphs: [
          '한반도에 철기가 보급되기 시작한 것은 기원전 5세기경으로 알려져 있습니다. 처음에는 청동기도 함께 쓰였고, 기원전 1세기경부터 철기가 널리 퍼졌습니다. 철은 삽·괭이·낫 같은 농기구, 칼·창·화살촉 같은 무기, 끌·톱·도끼·자귀 같은 공구에 활용되었습니다.',
          '이전의 돌·나무 도구와 청동기가 한순간에 모두 사라진 것은 아닙니다. 시대가 바뀌는 과정은 여러 도구가 함께 쓰이는 변화로 이해하세요. 「철기=모든 도구의 완전 교체」로 읽지 마세요.',
        ],
        recallPrompt: '철기가 쓰인 용도 두 가지를 들고, 철기 보급과 함께 기존 도구가 모두 사라졌는지 말해 보세요.',
        expectedElements: ['농기구·무기·공구 가운데 두 가지', '기존 돌·나무·청동기와 함께 사용'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0020_0010',
      },
      {
        conceptId: 't-pre-03',
        title: '고조선: 건국 전승과 국가의 성장을 구분하기',
        paragraphs: [
          '단군의 고조선 건국은 건국 전승입니다. 곰·호랑이 이야기, 바람·비·구름을 주관하는 존재 등의 요소에서 선사 신앙과 농경 사회 배경을 읽을 수 있습니다. 전승은 「우리 역사가 오래되었다」는 인식과 민족적 자긍심의 원천으로도 다루어집니다.',
          '건국 전승의 인물인 단군과, 기원전 194년경 준왕을 몰아내고 왕위를 차지한 위만을 같은 사건으로 묶지 마세요. 전승·상징과 후기 정치 변동을 구분하는 것이 확인 문제의 핵심입니다.',
        ],
        recallPrompt: '단군과 위만은 각각 고조선의 어떤 내용과 연결되나요?',
        expectedElements: ['단군은 건국 전승', '위만은 고조선 후기의 집권'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0010',
      },
      {
        conceptId: 't-pre-04',
        title: '위만의 집권부터 고조선 멸망까지',
        paragraphs: [
          '기원전 2세기경 연 지역에서 들어온 위만이 준왕을 몰아내고 왕이 되었습니다(기원전 194). 위만 조선은 철기 문화를 바탕으로 세력을 넓히고, 한과 한반도 남부(진) 사이의 중계 무역으로 이익을 얻었습니다.',
          '고조선이 강성해지자 한은 왕검성을 공격하였고, 위만의 손자 우거왕 때 왕검성이 함락되며 고조선은 멸망했습니다(기원전 108). 순서 기억: 위만 집권 → 중계 무역·세력 성장 → 한과의 충돌·멸망. 한 군현 설치는 멸망 이후의 일입니다.',
        ],
        recallPrompt: '위만의 집권, 중계 무역, 한과의 전쟁을 앞뒤 관계에 맞게 연결해 보세요.',
        expectedElements: ['준왕을 몰아내고 집권', '중계 무역으로 세력 성장', '한과의 충돌 뒤 멸망'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020',
      },
      {
        conceptId: 't-pre-05',
        title: '8조법: 법에서 사회 모습을 읽기',
        paragraphs: [
          '고조선에는 사회 질서를 위한 법률이 있었는데, 8개 조항 가운데 오늘날 전하는 것은 세 조항입니다. 살인자는 사형, 상해는 곡물로 배상, 절도자는 노비로 삼거나 속죄금을 내게 한다는 내용입니다.',
          '이 규정에서 생명(노동력)과 사유 재산을 중시한 사회 모습을 읽을 수 있습니다. 「8조법이 전부 남아 있다」거나 「골품제와 같은 제도」로 읽지 마세요. 골품제는 신라의 신분제입니다.',
        ],
        recallPrompt: '8조법의 처벌·배상 규정으로 알 수 있는 사회적 가치 두 가지는 무엇인가요?',
        expectedElements: ['생명·노동력의 중시', '사유 재산의 보호'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0030',
      },
      {
        conceptId: 't-pre-08',
        title: '마지막 연결: 유물·인물·제도를 나누어 기억하기',
        paragraphs: [
          '유물은 생활 방식과 시기를, 인물은 사건을, 법은 사회 모습을 연결하는 단서로 읽습니다. 빗살무늬토기·움집은 신석기, 고인돌·비파형 동검·민무늬 토기는 청동기, 단군 전승·위만 집권·8조법·한과의 전쟁은 고조선과 연결해 비교합니다.',
          '확인 문제에서는 「어느 시대의 표지인가」와 「어느 국가·인물의 사건인가」를 먼저 가른 뒤, 비슷한 이웃 국가(부여·옥저·동예·삼한)나 뒤 시대 제도와 혼동하지 않는지 점검하세요.',
        ],
        recallPrompt: '빗살무늬토기, 고인돌, 위만, 8조법을 각각 시대 또는 국가와 연결해 보세요.',
        expectedElements: ['빗살무늬토기: 신석기', '고인돌: 청동기', '위만·8조법: 고조선'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0020_0010',
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0030',
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0030',
        ],
      },
    ],
  },
]

export function guideForLesson(lessonId: string): LessonGuide | undefined {
  return lessonGuides.find((guide) => guide.lessonId === lessonId)
}
