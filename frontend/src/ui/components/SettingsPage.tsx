import type { ReactNode } from 'react'
import { SETTINGS_SECTIONS } from '../navigation'
import { PageHeader } from './ui/PageHeader'
import { SectionTabs } from './ui/SectionTabs'

const PURPOSE: Record<string, string> = {
  agents: 'Connect AI agents and API clients to Skylark.',
  integrations: 'Connect the trackers that tickets are opened in.',
  help: 'How Skylark works, in a few minutes.',
}

export const SettingsPage = ({ section, onSection, render }: { section: string; onSection: (s: string) => void; render: (section: string) => ReactNode }) => {
  const active = SETTINGS_SECTIONS.some(s => s.id === section) ? section : 'agents'
  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" purpose={PURPOSE[active]} />
      <SectionTabs label="Settings sections" sections={SETTINGS_SECTIONS} active={active} onChange={onSection} />
      <div className="space-y-6">{render(active)}</div>
    </div>
  )
}
