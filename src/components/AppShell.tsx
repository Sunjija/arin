import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '오늘', end: true },
  { to: '/study', label: '학습' },
  { to: '/cards', label: '카드' },
  { to: '/progress', label: '진도' },
  { to: '/mock', label: '모의' },
  { to: '/settings', label: '설정' },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-xl text-[var(--accent)] sm:text-2xl">한사코치</p>
          <p className="text-sm text-[var(--ink-muted)]">심화 맞춤 학습 · 자체 제작 문항</p>
        </div>
      </header>
      <main>{children}</main>
      <nav className="nav-bottom" aria-label="주요 메뉴">
        <div
          className="nav-bottom-inner"
          style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
