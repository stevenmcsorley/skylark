import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  /** One sentence: what this page is for. Every page states it. */
  purpose: string
  actions?: ReactNode
  /** Small link above the title, e.g. a way back. */
  back?: ReactNode
  testId?: string
}

export const PageHeader = ({ title, purpose, actions, back, testId }: PageHeaderProps) => (
  <header className="mb-6" data-testid={testId}>
    {back && <div className="mb-2">{back}</div>}
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h1>
        <p className="mt-1 max-w-[62ch] text-sm text-slate-400">{purpose}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </header>
)
