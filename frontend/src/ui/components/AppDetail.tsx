import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { APP_SECTIONS } from '../navigation'
import type { Project } from '../types/app.types'
import { ConnectApp } from './ConnectApp'
import { SecretValue } from './SecretValue'
import { Icon } from './ui/Icon'
import { PageHeader } from './ui/PageHeader'
import { SectionTabs } from './ui/SectionTabs'

const PURPOSE: Record<string, string> = {
  health: 'Is it working? Open issues and the last 24 hours.',
  setup: 'Connect this app: paste one snippet, send a test event, and watch it arrive.',
  releases: 'Record releases and deploys so errors can be tied to a change.',
  alerts: 'Choose who is told, and when, as errors arrive.',
  charts: 'Event volume over time, split by level.',
}

interface AppDetailProps {
  project: Project
  section: string
  onSection: (section: string) => void
  onBack: () => void
  /** The content of each section; the page around it is the same for all of them. */
  render: (section: string) => ReactNode
}

export const AppDetail = ({ project, section, onSection, onBack, render }: AppDetailProps) => {
  const active = APP_SECTIONS.some(s => s.id === section) ? section : 'health'
  return (
    <div data-testid="app-detail">
      <PageHeader
        title={project.name}
        purpose={PURPOSE[active]}
        back={
          <button type="button" onClick={onBack} className="inline-flex min-h-8 items-center gap-1 text-sm text-slate-400 hover:text-slate-100" data-testid="apps-back">
            <Icon icon={ArrowLeft} size="sm" /> Apps
          </button>
        }
        actions={<span className="font-mono text-sm text-slate-400" data-testid="project-info">{project.slug}</span>}
      />
      <SectionTabs label={`${project.name} sections`} sections={APP_SECTIONS} active={active} onChange={onSection} />
      <div className="space-y-6">{render(active)}</div>
    </div>
  )
}

/** The Setup section: the DSN and snippets, plus the raw token for anything that is not a Sentry SDK. */
export const AppSetup = ({ project }: { project: Project }) => (
  <div className="space-y-6" data-testid="app-setup">
    <section className="rounded-lg border border-slate-700 bg-slate-950 p-5">
      <ConnectApp project={project} />
    </section>
    <section className="rounded-lg border border-slate-700 bg-slate-950 p-5">
      <h2 className="text-base font-semibold text-slate-100">Ingest token</h2>
      <p className="mt-1 text-sm text-slate-300">For scripts and services that are not using a Sentry SDK. Treat it like a password.</p>
      <div className="mt-3"><SecretValue value={project.ingest_token} label={`${project.name} ingest token`} /></div>
    </section>
  </div>
)
