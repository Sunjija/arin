/** 카드 중복 방지용 정규화 지문 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

export function cardFingerprint(front: string, back: string): string {
  const a = normalizeText(front)
  const b = normalizeText(back)
  // 앞·뒤가 바뀐 동일 카드도 같은 지문으로 취급
  return [a, b].sort().join('|')
}
