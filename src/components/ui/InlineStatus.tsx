import type { ReactNode } from 'react'

export type InlineStatusTone = 'neutral' | 'success' | 'error'

export function InlineStatus({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: InlineStatusTone
}) {
  return (
    <p className="status-inline" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
