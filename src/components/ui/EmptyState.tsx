import type { ReactNode } from 'react'

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state surface">
      <p className="section-title">{title}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}
