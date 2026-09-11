import type { LessonGuide } from '../types'

/** Original learning explanations. Source checks are separate from expert exam approval. */
export const lessonGuides: LessonGuide[] = [
  {
    lessonId: 'lesson-01',
    contentVersion: 1,
    reviewStatus: 'source-checked',
    checkedAt: '2026-09-11',
    introduction: '생활 도구와 생산 방식이 어떻게 달라졌는지 먼저 이해하고, 그 변화 속에서 고조선의 성립과 사회 모습을 연결해 봅니다.',
    sections: [
      {
        conceptId: 't-pre-01',
        title: '구석기와 신석기: 생활 방식이 달라지다',
        paragraphs: [
          '구석기 사람들은 뗀석기를 사용하며 사냥과 채집을 했고, 먹을거리를 찾아 이동했습니다. 신석기에는 간석기와 토기를 사용하고 농경·목축을 시작하면서 정착 생활이 발달했습니다. 사냥과 어로가 사라진 것은 아닙니다.',
          '빗살무늬토기·움집·초기 농경이 함께 나오면 신석기를 떠올리세요. 농경이라는 말 하나만으로 시대를 결정하지 말고, 어떤 유물과 생활 모습이 함께 제시됐는지 확인합니다.',
        ],
        recallPrompt: '구석기와 신석기의 차이를 도구와 생활 방식에서 각각 하나씩 말해 보세요.',
        expectedElements: ['뗀석기와 간석기·토기', '이동 생활과 농경·정착의 발달'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0020_0010',
      },
      {
        conceptId: 't-pre-02',
        title: '청동기: 생산의 성장과 지배층의 등장',
        paragraphs: [
          '농경이 발달하면서 재산의 차이와 계층 분화가 나타났습니다. 많은 사람의 노동이 필요한 고인돌은 지배층의 존재를 읽는 단서입니다. 비파형 동검도 청동기 문화를 파악하는 대표 유물입니다.',
          '청동기는 무기나 의례·장식에 쓰였으며 생활 도구 전체를 대신하지 않았습니다. 돌과 나무로 만든 도구도 계속 사용했습니다. 민무늬 토기를 신석기의 빗살무늬토기와 비교해 두세요.',
        ],
        recallPrompt: '고인돌이 지배층의 존재를 보여 주는 이유와 청동기 시대에도 쓰인 생활 도구를 설명해 보세요.',
        expectedElements: ['큰 무덤을 만드는 노동력을 동원할 수 있는 지배층', '돌·나무 도구도 계속 사용'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0030',
        additionalSourceUrls: ['https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0010'],
      },
      {
        conceptId: 't-pre-07',
        title: '철기: 농기구와 무기로 활용되다',
        paragraphs: ['철은 농기구·무기·공구에 활용되었습니다. 이전의 돌·나무 도구와 청동기가 한순간에 모두 사라진 것은 아닙니다. 시대가 바뀌는 과정은 여러 도구가 함께 쓰이는 변화로 이해하세요.'],
        recallPrompt: '철기가 쓰인 용도 두 가지를 들고, 철기 보급과 함께 기존 도구가 모두 사라졌는지 말해 보세요.',
        expectedElements: ['농기구·무기·공구 가운데 두 가지', '기존 도구와 함께 사용'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0020_0010',
      },
      {
        conceptId: 't-pre-03',
        title: '고조선: 건국 전승과 국가의 성장을 구분하기',
        paragraphs: ['단군의 이야기는 고조선의 건국 전승입니다. 농경 사회와 정치적 통합의 배경을 읽는 자료로 살펴봅니다. 건국 전승의 인물인 단군과 고조선 후기에 왕위를 차지한 위만을 같은 사건으로 묶지 마세요.'],
        recallPrompt: '단군과 위만은 각각 고조선의 어떤 내용과 연결되나요?',
        expectedElements: ['단군은 건국 전승', '위만은 고조선 후기의 집권'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0010',
      },
      {
        conceptId: 't-pre-04',
        title: '위만의 집권부터 고조선 멸망까지',
        paragraphs: ['위만은 고조선에 들어온 뒤 준왕을 몰아내고 왕위를 차지했습니다. 위만 조선은 철기 문화를 바탕으로 세력을 넓히고 한과 한반도 남부 사이의 중계 무역에서 이익을 얻었습니다. 이후 한과 충돌했고, 왕검성이 함락되며 멸망했습니다.'],
        recallPrompt: '위만의 집권, 중계 무역, 한과의 전쟁을 앞뒤 관계에 맞게 연결해 보세요.',
        expectedElements: ['준왕을 몰아내고 집권', '중계 무역으로 세력 성장', '한과의 충돌 뒤 멸망'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020',
      },
      {
        conceptId: 't-pre-05',
        title: '8조법: 법에서 사회 모습을 읽기',
        paragraphs: ['8조법 가운데 오늘날 전하는 것은 세 조항입니다. 살인·상해·절도에 대한 처벌과 배상에서 생명과 재산을 중시한 사회 모습을 읽을 수 있습니다. 모든 조항이 그대로 남아 있다는 설명은 피해야 합니다.'],
        recallPrompt: '8조법의 처벌·배상 규정으로 알 수 있는 사회적 가치 두 가지는 무엇인가요?',
        expectedElements: ['생명·노동력의 중시', '사유 재산의 보호'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0030',
      },
      {
        conceptId: 't-pre-08',
        title: '마지막 연결: 유물·인물·제도를 나누어 기억하기',
        paragraphs: ['유물은 생활 방식과 시기를, 인물은 사건을, 법은 사회 모습을 연결하는 단서로 읽습니다. 빗살무늬토기는 신석기, 고인돌·비파형 동검은 청동기, 단군 전승·위만·8조법은 고조선과 연결해 비교합니다.'],
        recallPrompt: '빗살무늬토기, 고인돌, 위만, 8조법을 각각 시대 또는 국가와 연결해 보세요.',
        expectedElements: ['빗살무늬토기: 신석기', '고인돌: 청동기', '위만·8조법: 고조선'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020',
        additionalSourceUrls: ['https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0020_0010'],
      },
    ],
  },
]

export function guideForLesson(lessonId: string): LessonGuide | undefined {
  return lessonGuides.find((guide) => guide.lessonId === lessonId)
}
