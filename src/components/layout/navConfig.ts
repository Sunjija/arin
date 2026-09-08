export const LIBRARY_PATH = '/timeline'
export const LIBRARY_QUERY_KEYS = {
  tab: 'tab',
  era: 'era',
  q: 'q',
  sort: 'sort',
} as const

export type NavItem = {
  to: string
  label: string
  end?: boolean
  match: (pathname: string) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: '오늘',
    end: true,
    match: (pathname) => pathname === '/' || pathname === '/study',
  },
  {
    to: '/cards',
    label: '복습',
    match: (pathname) => pathname === '/cards' || pathname === '/wrong',
  },
  {
    to: LIBRARY_PATH,
    label: '자료실',
    match: (pathname) => pathname === '/timeline' || pathname === '/library',
  },
  {
    to: '/mock',
    label: '실전',
    match: (pathname) => pathname === '/mock',
  },
  {
    to: '/progress',
    label: '내 기록',
    match: (pathname) => pathname === '/progress' || pathname === '/settings',
  },
]
