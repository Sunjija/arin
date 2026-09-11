import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useFocusLayoutControl } from './layout/useFocusLayout'
import { NAV_ITEMS } from './layout/navConfig'

const ICONS: Record<string, ReactNode> = {
  오늘: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  ),
  복습: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  ),
  자료실: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 19V6l8-3 8 3v13" />
      <path d="M4 19l8-3 8 3" />
      <path d="M12 3v13" />
    </svg>
  ),
  실전: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  '내 기록': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 19V8l7-4 7 4v11" />
      <path d="M9 19v-6h6v6" />
    </svg>
  ),
}

export function AppShell({ children }: { children: ReactNode }) {
  const { focused } = useFocusLayoutControl()
  const location = useLocation()

  return (
    <div className={`app-shell${focused ? ' is-focus' : ''}`}>
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
          {NAV_ITEMS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              className={() =>
                `desktop-nav-link ${link.match(location.pathname) ? 'active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <nav className="nav-bottom" aria-label="모바일 주요 메뉴">
        <div className="nav-bottom-inner">
          {NAV_ITEMS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              className={() => `nav-link ${link.match(location.pathname) ? 'active' : ''}`}
            >
              {ICONS[link.label]}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
