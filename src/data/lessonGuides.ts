import type { LessonGuide } from '../types'

/** Original learning explanations. Source checks are separate from expert exam approval. */
export const lessonGuides: LessonGuide[] = [
  {
    lessonId: 'lesson-01',
    contentVersion: 5,
    reviewStatus: 'source-checked',
    checkedAt: '2026-09-13',
    introduction:
      '생활 도구와 생산 방식이 어떻게 달라졌는지 먼저 이해하고, 그 변화 속에서 고조선의 성립과 사회 모습을 연결한 뒤, 이웃한 여러 나라의 제도·풍속을 비교합니다.',
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
        expectedElements: ['큰 무덤을 만드는 노동력을 동원할 수 있는 지배층', '돌·나무 도구도 계속 사용'],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0030',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0010_0030_0010',
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0020_0020_0010_0020',
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
      {
        conceptId: 't-pre-06',
        title: '부여·옥저·동예·삼한: 제도로 이웃 나라 가리기',
        paragraphs: [
          '고조선 주변에도 여러 정치 집단이 있었습니다. 「누가 다스렸는가」와 「어떤 풍속이 있었는가」를 짝지어 비교해 보세요. 부여에서는 왕과 마가·우가·저가·구가 등 제가가 권력을 나누었습니다. 제가가 사출도를 다스리고 왕이 중앙을 다스려 5부를 이루었습니다. 12월에는 영고라는 제천 행사를 열었습니다.',
          '옥저와 동예에는 읍군·삼로 같은 읍락 군장이 있었지만, 여러 읍락을 하나의 강한 왕권으로 통합하지는 못했습니다. 옥저의 민며느리제는 어린 신부가 신랑 집에서 자란 뒤 혼인하는 풍속입니다. 동예의 책화는 다른 읍락의 생활권을 침범했을 때 노비·소·말 등으로 배상하는 관습입니다. 혼인 풍속과 영역 침범에 대한 배상을 구분하세요.',
          '동예에서는 10월 무천이라는 제천 행사를 열었고, 같은 씨족끼리 혼인하지 않는 족외혼을 지켰습니다. 부여의 영고와 동예의 무천은 모두 제천 행사지만 나라와 시기가 다릅니다.',
          '삼한은 마한·진한·변한의 여러 소국으로 이루어졌습니다. 정치적 지배자와 별도로 천군이 천신 제사를 주관했습니다. 소도는 큰 나무에 방울과 북을 달아 둔 신성한 구역으로, 군장의 권력이 함부로 미치지 못했습니다. 제사와 정치의 담당자가 구별된다는 점을 부여의 왕·제가, 옥저의 혼인 풍속, 동예의 배상 관습과 비교하세요.',
        ],
        recallPrompt:
          '부여의 왕·제가(사출도)·영고, 옥저의 민며느리제와 통합 왕권의 약함, 동예의 무천·책화·족외혼, 삼한의 천군·소도를 각각 짝지어 말해 보세요.',
        expectedElements: [
          '부여: 왕과 제가의 사출도, 영고',
          '옥저: 민며느리제, 큰 통합 왕권은 약함',
          '동예: 무천·족외혼·책화',
          '삼한: 천군과 소도(제정 구분)',
        ],
        sourceUrl: 'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_h61_0030_0020_0030',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_h71_0030_0020_0020_0030',
          'https://contents.history.go.kr/front/hm/view.do?levelId=hm_003_0020',
          'https://contents.history.go.kr/id/hm_003_0070',
          'https://contents.history.go.kr/id/hm_006_0020',
          'https://contents.history.go.kr/id/hm_007_0020',
        ],
      },
    ],
  },
  {
    lessonId: 'lesson-02',
    contentVersion: 4,
    reviewStatus: 'source-checked',
    checkedAt: '2026-09-13',
    introduction:
      '고구려 전성기 왕의 체제 정비·영토 확대·천도/남진을 구분한 뒤, 신라 법흥왕의 율령·불교 공인을 정리하고, 골품제와 화랑·병부·상대등을 연결합니다.',
    sections: [
      {
        conceptId: 't-tk-01',
        title: '고구려 전성기 왕: 체제 정비 → 영토 확대 → 평양 천도',
        paragraphs: [
          '여러 나라의 제도와 풍속을 비교했다면, 이제 고구려의 왕들이 나라를 강화한 방식을 살펴봅시다. 소수림왕의 체제 정비, 광개토왕의 영토 확대, 장수왕의 평양 천도를 구분하는 것이 목표입니다.',
          '소수림왕(재위 371~384)은 전진으로부터 불교를 받아들여 국가 차원에서 지원하고, 태학을 세워 자제를 교육했으며, 율령을 반포해 통치 질서를 문서로 정리했습니다. 불교는 왕권을 뒷받침하고, 태학은 인재를 기르며, 율령은 통치 기준을 마련하는 데 도움이 되었습니다.',
          '광개토왕(광개토대왕)은 정복 전쟁을 통해 영토를 크게 넓혔습니다. 비문에 보이는 영역 확장·대외 원정이 이 왕의 표지입니다. 평양으로의 천도는 그의 업적이 아닙니다.',
          '장수왕은 427년 국내성에서 평양으로 도읍을 옮기고 남진을 본격화했습니다. 475년 백제 한성을 함락하며 한강 유역을 확보한 흐름도 장수왕의 남진과 연결됩니다. 「율령·태학」은 소수림, 「영토 확대」는 광개토, 「평양 천도·남진」은 장수로 짝지으세요.',
        ],
        recallPrompt:
          '소수림왕·광개토왕·장수왕의 핵심 업적을 각각 한 가지씩 구분해서 말해 보세요.',
        expectedElements: [
          '소수림왕: 불교 수용·태학·율령(체제 정비)',
          '광개토왕: 정복·영토 확대',
          '장수왕: 평양 천도·남진(한성 함락 흐름)',
        ],
        sourceUrl: 'https://contents.history.go.kr/id/hm_009_0030',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101200',
          'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_009_0040',
          'https://contents.history.go.kr/id/hm_009_0050',
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0020_0010_0020',
        ],
      },
      {
        conceptId: 't-tk-03',
        title: '신라 법흥왕: 율령·공복과 불교 공인',
        paragraphs: [
          '앞에서 왕별 업적을 구분한 방법을 신라에도 적용해 봅시다. 법흥왕이 법과 불교를 통해 나라를 정비한 과정을 이해하고, 뒤를 이은 진흥왕의 영토 확장과 구분해 보세요.',
          '법흥왕은 율령을 반포하고 관리의 공복을 정해 위계를 드러냈습니다. 병부 설치 등 관제 정비도 같은 왕의 체제 강화 흐름으로 읽습니다.',
          '불교는 이미 알려졌으나 귀족의 반대로 공인이 늦었습니다. 이차돈의 순교를 계기로 법흥왕 대에 불교가 공식적으로 인정되었습니다. 「이차돈=불교 공인의 계기」를 「진흥왕=한강·순수비」와 바꾸어 외우지 마세요.',
          '법흥왕의 뒤를 이은 진흥왕은 한강 유역을 확보하고 순수비를 세웠습니다. 「이차돈·율령·공복」과 「한강 확보·순수비」가 각각 어느 왕을 가리키는지 비교하면 두 왕을 혼동하지 않을 수 있습니다.',
        ],
        recallPrompt:
          '법흥왕의 율령·공복·불교 공인(이차돈)과, 진흥왕의 한강·순수를 각각 짝지어 말해 보세요.',
        expectedElements: [
          '법흥왕: 율령·공복, 이차돈을 계기로 한 불교 공인',
          '진흥왕: 한강 유역·순수(이번 개념의 혼동 대상)',
        ],
        sourceUrl: 'https://contents.history.go.kr/id/hm_011_0040',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101130',
          'https://contents.history.go.kr/mobile/km/view.do?levelId=km_011_0020_0010',
        ],
      },
      {
        conceptId: 't-tk-05',
        title: '골품제: 진골·6두품과 관등·생활 제한',
        paragraphs: [
          '법흥왕 대의 율령·관제 정비와 이어, 신라 사회를 오래 규정한 골품제를 살펴봅시다. 혈통에 따라 관등 진출과 생활 범위가 달라진다는 점이 핵심입니다.',
          '골품제는 혈통의 높고 낮음에 따라 정치적 출세뿐 아니라 혼인, 가옥의 크기, 의복의 빛깔, 우마차 장식 등 일상에도 특권과 제약을 둡니다. 「능력만 있으면 신분이 바뀐다」로 읽지 마세요.',
          '관등은 관리의 등급이며 숫자가 작을수록 높습니다. 진골은 고위 관직 진출에서 유리한 신분입니다. 17관등 가운데 대아찬 이상(1~5등)은 진골만 받을 수 있었습니다. 6두품은 그다음 신분으로, 관등 상한은 제6관등 아찬입니다. 중위제(중아찬~4중아찬)는 아찬 안에서 특진 길을 연 제도이지, 대아찬 이상으로 넘어가게 해 주는 제도가 아닙니다.',
          '왕위 자격은 성골·진골 구분과 성골 소멸처럼 시기에 따라 달라집니다. 모든 왕대의 왕위 자격을 한 문장으로 동일하게 설명하지 마세요. 이번 학습에서는 진골·6두품의 관등·생활 제한을 비교하는 데 집중합니다.',
        ],
        recallPrompt:
          '진골과 6두품의 관등 진출 차이, 중위제의 한계, 골품에 따른 생활 제한 한 가지를 설명해 보세요.',
        expectedElements: [
          '진골: 대아찬 이상(고위 관등) 가능',
          '6두품: 아찬까지가 상한',
          '중위제는 아찬 범주를 넘지 않음',
          '혼인·가옥·의복 등 생활 제한',
        ],
        sourceUrl: 'https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_001_0400&pageUnit=10&treeId=0209',
        additionalSourceUrls: [
          'https://contents.history.go.kr/front/nh/view.do?levelId=nh_011_0020_0040_0010',
          'https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_011_0020_0040_0030',
          'https://contents.history.go.kr/id/hm_018_0030',
        ],
      },
      {
        conceptId: 't-tk-06',
        title: '화랑도·병부·상대등: 기능과 설치를 구분하기',
        paragraphs: [
          '골품으로 신분 질서를 이해했다면, 인재를 기르는 화랑도, 군사 관부인 병부, 고위 관직인 상대등을 구분해 봅시다. 비슷한 「나라의 일」이어도 성격이 다릅니다.',
          '화랑도는 화랑을 중심으로 청소년들이 도의·노래·산수 유람 등으로 수련하며 인재를 기르는 조직입니다. 함께 지내며 사람됨을 살피고 뛰어난 이를 조정에 천거했습니다. 진흥왕 대에 국가의 인재 양성과 연결되었으며, 무예 수련과 전쟁 참여의 면도 있었습니다. 군사 업무를 처리하는 관청인 병부와는 구분합니다.',
          '병부는 군사 업무를 담당하는 관부입니다. 문헌에 보이는 신라 최초의 관부로서 법흥왕 대에 설치되었습니다. 상대등은 나라의 일을 총괄하는 고위 관직으로, 역시 법흥왕 대에 처음 두었습니다. 『삼국사기』는 상대등을 당시(고려)의 재상에 비기지만, 오늘날의 총리와 동일하다고 단정하지 마세요.',
          '정리하면 병부·상대등은 법흥왕 대의 중앙 체제 정비, 화랑은 수련·인재 양성의 조직입니다. 설치 왕과 기능을 뒤바꾸지 마세요.',
        ],
        recallPrompt:
          '화랑·병부·상대등의 기능과, 병부·상대등을 설치한 왕을 구분해 말해 보세요.',
        expectedElements: [
          '화랑: 수련·인재 천거(정규 군부대·관청 아님)',
          '병부: 군사 업무 관부(법흥왕 대 설치)',
          '상대등: 국정 총괄 고위 관직(법흥왕 대 설치, 현대 총리와 동일시 금지)',
        ],
        sourceUrl: 'https://contents.history.go.kr/id/hm_011_0040',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101130',
          'https://contents.history.go.kr/id/hm_021_0020',
          'https://contents.history.go.kr/mobile/mid/kc_n101750',
        ],
      },
    ],
  },
  {
    lessonId: 'lesson-13',
    contentVersion: 4,
    reviewStatus: 'source-checked',
    checkedAt: '2026-09-13',
    introduction:
      '백제의 전성기와 도읍 이동을 왕·원인·지명으로 구분한 뒤, 신라 진흥왕의 한강 확보와 순수비·적성비를 법흥왕과 섞지 않도록 정리합니다.',
    sections: [
      {
        conceptId: 't-tk-02',
        title: '백제 전성·천도: 근초고왕과 웅진·사비',
        paragraphs: [
          '장수왕의 남진은 이웃 백제에도 큰 영향을 주었습니다. 백제의 전성기부터 한성→웅진→사비로 이어지는 도읍 이동을 살펴보고, 각 천도의 왕과 배경을 구분해 보세요.',
          '4세기 후반 근초고왕 대에 백제는 전성기를 맞았습니다. 북으로는 고구려와 맞서고, 남으로는 마한 세력에 대한 영향력을 넓혔습니다. 다만 영역의 확대와 각 지역을 직접 다스리는 제도의 완성은 다릅니다. 마한의 모든 지역이 한 시점에 같은 방식으로 통합되었다고 단정하지 마세요.',
          '475년 고구려(장수왕)의 공격으로 한성이 함락되자, 문주왕은 도읍을 웅진(오늘날 공주)으로 옮겼습니다. 국난에 따른 긴급 천도입니다.',
          '성왕은 538년 웅진에서 사비(오늘날 부여)로 천도하고 국호를 남부여로 고치며 중흥과 체제 정비를 추진했습니다. 웅진 천도(문주)와 사비 천도(성왕)를 같은 왕·같은 이유로 묶지 마세요.',
        ],
        recallPrompt:
          '근초고왕의 전성기, 문주왕의 웅진 천도 계기, 성왕의 사비 천도를 각각 구분해 말해 보세요.',
        expectedElements: [
          '근초고왕: 전성기·고구려와 대립·남쪽으로 세력 확대',
          '문주왕: 한성 함락 뒤 웅진 천도',
          '성왕: 사비 천도·남부여',
        ],
        sourceUrl: 'https://contents.history.go.kr/id/hm_010_0020',
        additionalSourceUrls: [
          'https://contents.history.go.kr/front/nh/print.do?levelId=nh_006_0020_0020_0040',
          'https://contents.history.go.kr/front/nh/view.do?levelId=nh_006_0030_0020',
          'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n101190',
          'https://contents.history.go.kr/id/hm_009_0050',
        ],
      },
      {
        conceptId: 't-tk-04',
        title: '진흥왕: 한강 확보와 순수비·적성비',
        paragraphs: [
          '백제 도읍 이동을 구분했다면, 같은 6세기 중반 신라 진흥왕의 영토 확장을 살펴봅시다. 법흥왕의 체제 정비와 섞지 않는 것이 목표입니다.',
          '진흥왕은 백제와 함께 고구려를 쳐서 한강 상류를 확보한 뒤, 다시 백제로부터 한강 하류까지 차지하며 한강 유역을 신라 영토로 삼았습니다. 새로 편입한 지역을 왕이 돌아보며(순수) 세운 비가 순수비입니다. 북한산·마운령·황초령 순수비 등이 진흥왕의 영역 확대를 보여 줍니다.',
          '단양 적성비는 같은 진흥왕 대의 영토 확대와 관련되지만, 순수비와 성격이 다릅니다. 적성비는 척경에 공을 세운 지방민을 표창하고 충성을 권하는 내용이 중심입니다. 「적성비=순수비」로 묶지 마세요.',
          '한강 유역은 농경에 유리하고 인구와 물자가 모이는 지역입니다. 이를 확보한 신라는 경제력을 키우고 황해를 거쳐 중국과 직접 교류하기에도 유리해졌습니다. 법흥왕의 율령·공복·불교 공인과 진흥왕의 한강 확보·순수를 구분해 복습하세요.',
        ],
        recallPrompt:
          '진흥왕의 한강 확보·순수비와 법흥왕의 체제 정비를 구분하고, 적성비와 순수비의 성격 차이를 말해 보세요.',
        expectedElements: [
          '진흥왕: 한강 유역 확보·순수비',
          '법흥왕: 율령·공복·불교 공인(혼동 대상)',
          '순수비: 왕의 순수 기념',
          '적성비: 공훈 표창·충성 권고(순수비와 구분)',
        ],
        sourceUrl: 'https://contents.history.go.kr/mobile/mid/kc_n101750',
        additionalSourceUrls: [
          'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0030_0020_0030_0020',
          'https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_001_0230&pageUnit=10&treeId=0206',
          'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_r100340',
          'https://contents.history.go.kr/id/hm_011_0040',
        ],
      },
    ],
  },
]

export function guideForLesson(lessonId: string): LessonGuide | undefined {
  return lessonGuides.find((guide) => guide.lessonId === lessonId)
}
