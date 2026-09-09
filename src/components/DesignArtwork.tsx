import type { EraId } from '../types'

export function Dolmen({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 200 160" fill="none" aria-hidden="true">
    <circle cx="105" cy="69" r="66" fill="#EEE2CE" />
    <path d="M0 146Q94 110 197 145" stroke="#C5B8A6" />
    <path d="M55 75L78 73L75 134L54 132Z" fill="#A8ACA6" stroke="#727D79" />
    <path d="M130 75L151 78L148 131L133 135Z" fill="#8D9994" stroke="#63736C" />
    <path d="M32 61L57 48L126 44L169 59L174 76L127 85L64 80L30 74Z" fill="#CAD0C6" stroke="#718078" strokeWidth="1.5" />
    <path d="M30 74L65 80L128 85L174 76L174 84L126 93L60 87L32 82Z" fill="#89988C" stroke="#718078" />
    <path d="M56 61L118 55M76 70L133 64M62 100L68 106M139 99L142 115" stroke="#718078" />
    <circle cx="24" cy="130" r="2" fill="#AA9575" /><circle cx="177" cy="123" r="3" fill="#AA9575" />
  </svg>
}

export function ChapterArtwork({ era }: { era: EraId }) {
  if (era === 'prehistoric') return <Dolmen className="chapter-art" />
  return <svg className="chapter-art" viewBox="0 0 200 160" aria-hidden="true">
    <circle cx="110" cy="75" r="68" fill="#E5DBC7" />
    <path d="M24 49Q65 29 105 49Q144 29 182 49V133Q143 115 105 137Q64 116 24 133Z" fill="#FAF7ED" stroke="#A99D84" strokeWidth="2" />
    <path d="M105 49V137M38 66Q62 54 87 66M38 82Q62 70 87 82M38 98Q62 86 87 98M122 66Q144 55 168 65M122 82Q144 71 168 81" fill="none" stroke="#B7AB94" strokeWidth="2" />
    <path d="M142 36V91L153 84L164 91V36" fill="#C63D2B" />
  </svg>
}

export function ArrowIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg> }
