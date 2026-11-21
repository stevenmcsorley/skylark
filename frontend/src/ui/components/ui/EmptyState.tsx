import type { ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'
import { Icon } from './Icon'
import type { IconComponent } from './Icon'

interface EmptyStateProps {
  /** A lucide icon component (not an element, and never an emoji). */
  icon?: IconComponent
  title: string
  description?: string
  action?: ReactNode
  testId?: string
}

export const EmptyState = ({ icon, title, description, action, testId }: EmptyStateProps) => (
  <div className="rounded-lg border border-slate-800 px-6 py-10 text-center" data-testid={testId}>
    {icon && (
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-500">
        <Icon icon={icon} size="lg" />
      </div>
    )}
    <h3 className="mb-1 text-base font-semibold text-slate-100">{title}</h3>
    {description && <p className="mx-auto max-w-md text-sm text-slate-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

interface NoProjectSelectedProps {
  testId?: string
}

export const NoProjectSelected = ({ testId }: NoProjectSelectedProps) => (
  <EmptyState
    icon={FolderOpen}
    title="No project selected"
    description="Create or select a project in the Projects tab to get started."
    testId={testId}
  />
)
