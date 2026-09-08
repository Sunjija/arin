import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

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
      <header className="site-header">
        <Link to="/" className="brand" aria-label="한사코치 오늘 화면">
          <span className="brand-mark" aria-hidden>
            한
          </span>
          <span>
            <strong className="brand-name">한사코치</strong>
            <span className="brand-copy">한국사 심화 학습</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <nav className="nav-bottom" aria-label="모바일 주요 메뉴">
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
