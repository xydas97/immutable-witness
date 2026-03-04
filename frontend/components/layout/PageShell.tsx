import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  /** Full-width mode for the map page (no max-width container) */
  fullWidth?: boolean
}

export function PageShell({ children, fullWidth = false }: PageShellProps) {
  if (fullWidth) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-6">
      {children}
    </main>
  )
}
