import type { FlashcardSeed } from '../types'

/** Keyed by the displayed topic so previously saved cards get the same clear question. */
const conceptQuestions: Record<string, string> = {
  '광종 vs 성종, 정책 목적 차이': '광종과 성종의 정책은 각각 어떤 목적을 가졌나요?',
  '삼별초': '삼별초는 어떤 조직에서 출발했고, 무엇에 반대하여 어디로 이동하며 항쟁했나요?',
  '빗살무늬토기': '빗살무늬토기는 어느 시대의 유물이며, 당시 사람들의 생활 방식은 어땠나요?',
  '비파형동검 · 고인돌': '비파형동검과 고인돌은 어느 시대의 유물·유적이며, 어떤 사회의 형성을 보여 주나요?',
  '통일신라 녹읍': '녹읍은 어느 계층의 경제 기반이었나요?',
  '경국대전': '경국대전은 어떤 내용을 담은 책이며, 어느 왕 때 완성되었나요?',
  '대동법': '대동법은 공물을 무엇으로 납부하게 했으며, 어떤 폐단을 줄이려 했나요?',
  '균역법': '균역법은 백성의 어떤 부담을 줄인 제도인가요?',
  '갑신정변': '갑신정변을 주도한 세력은 누구이며, 개혁 시도는 어떤 결과로 끝났나요?',
  '독립협회': '독립협회의 대표 활동과 추구한 권리는 무엇인가요?',
  '을사늑약': '을사늑약으로 대한제국이 빼앗긴 권리는 무엇인가요?',
  '의열단': '의열단의 대표 인물은 누구이며, 어떤 대상을 겨냥해 투쟁했나요?',
  '임시정부': '대한민국 임시정부가 지향한 정치 체제와 역할은 무엇인가요?',
  '석굴암·불국사': '석굴암과 불국사는 어느 시대의 어떤 종교 문화를 보여 주나요?',
  '팔만대장경': '팔만대장경은 어느 시대에 만들어졌으며, 어떤 염원을 담았나요?',
  '수원 화성': '수원 화성은 어느 왕 때 건설되었으며, 어떤 학문·기술과 연결되나요?',
  '8조법': '8조법은 어느 나라의 법이며, 무엇을 보호하려 했나요?',
  '부여·옥저·동예·삼한': '부여·옥저·동예·삼한의 대표 제도나 풍습을 각각 하나씩 연결해 보세요.',
  '이차돈 순교': '이차돈의 순교는 신라의 어떤 종교 정책과 연결되나요?',
  '전시과': '전시과는 어느 나라에서 누구를 대상으로 운영한 제도인가요?',
  '정동행성 · 쌍성총관부': '정동행성과 쌍성총관부는 고려의 어느 시기에 어떤 외세의 간섭과 연결되나요?',
  '6조 직계제': '6조 직계제를 시행한 대표 왕은 누구이며, 어떤 방식으로 왕권을 강화했나요?',
  '영정법 · 대동법 · 균역법': '영정법·대동법·균역법은 각각 전세·공물·군포 중 어떤 부담을 조정했나요?',
  '한인애국단': '한인애국단을 이끈 인물과 대표 의거를 떠올려 보세요.',
  '한국광복군': '한국광복군은 어느 기구에 소속된 부대이며, 누구와 싸웠나요?',
  '산미증식계획': '산미증식계획은 무엇을 늘리려 했으며, 조선 농민의 생활에는 어떤 영향을 주었나요?',
  '직지': '직지는 어느 시대의 책이며, 인쇄술에서 어떤 가치를 갖나요?',
  '고려청자': '고려청자의 대표 색과 장식 기법은 무엇인가요?',
  '동의보감': '동의보감은 어느 시대에 누가 편찬한 어떤 분야의 책인가요?',
}

export function cardPrompt(card: Pick<FlashcardSeed, 'front' | 'back' | 'kind'>): { question: string; answer: string } {
  if (card.kind === 'concept' && conceptQuestions[card.front]) {
    return { question: conceptQuestions[card.front], answer: card.back }
  }
  if (card.kind === 'king-to-deed') return { question: `${card.front}의 대표 업적이나 활동은 무엇인가요?`, answer: card.back }
  if (card.kind === 'deed-to-king') return { question: `다음 단서에 해당하는 인물은 누구인가요? — ${card.front}`, answer: card.back }
  if (card.kind === 'chronology') {
    if (card.front.includes('?')) return { question: `빈칸에 들어갈 사건은 무엇인가요? — ${card.front}`, answer: card.back }
    const events = card.front.split('→').map((event) => event.trim())
    if (events.length > 1) return { question: `다음 흐름에서 마지막 빈칸에 들어갈 사건·인물·유물은 무엇인가요? — ${events.slice(0, -1).join(' → ')} → ?`, answer: `${card.front}\n${card.back}` }
    return { question: `${card.front}: 이어지는 주요 사건을 순서대로 말해 보세요.`, answer: card.back }
  }
  return { question: card.front, answer: card.back }
}
