import type { ReactNode } from 'react'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const Home = () => (
  <Icon>
    <path d="M3 10.5L12 3l9 7.5V21a2 2 0 0 1-2 2h-5v-6H10v6H5a2 2 0 0 1-2-2V10.5z" />
    <path d="M3 10.5L12 3l9 7.5" />
  </Icon>
)

const Search = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
)

const Chart = () => (
  <Icon>
    <path d="M4 20V6" />
    <path d="M10 20V10" />
    <path d="M16 20V4" />
    <path d="M2 20h20" />
  </Icon>
)

const Folder = () => (
  <Icon>
    <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </Icon>
)

const Package = () => (
  <Icon>
    <path d="m7.5 4.27 9 5.15M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.29 7 12 12l8.71-5" />
    <path d="M12 22V12" />
  </Icon>
)

const Bell = () => (
  <Icon>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="m13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
)

const Estate = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
)

const Integrations = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
  </svg>
)

const Agent = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
)

const Help = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
)

const Issues = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" /></Icon>

export const NAV_ITEMS = [
  { id: 'estate', label: 'All projects', description: 'View the project estate', icon: Estate, group: '' },
  { id: 'overview', label: 'Overview', description: 'View project health', icon: Home, group: 'Monitor' },
  { id: 'issues', label: 'Issues', description: 'Inspect grouped errors', icon: Issues, group: 'Monitor' },
  { id: 'logs', label: 'Explore', description: 'Search events and logs', icon: Search, group: 'Monitor' },
  { id: 'dashboard', label: 'Dashboards', description: 'View project metrics', icon: Chart, group: 'Monitor' },
  { id: 'projects', label: 'Projects', description: 'Manage projects', icon: Folder, group: 'Manage' },
  { id: 'releases', label: 'Releases', description: 'Track deployments', icon: Package, group: 'Manage' },
  { id: 'alerts', label: 'Alerts', description: 'Manage alert rules', icon: Bell, group: 'Manage' },
  { id: 'integrations', label: 'Integrations', description: 'Connect services', icon: Integrations, group: 'Manage' },
  { id: 'mcp', label: 'MCP & API', description: 'Connect API clients and agents', icon: Agent, group: 'Connect' },
  { id: 'help', label: 'Help', description: 'Read Skylark help', icon: Help, group: 'Connect' },
] as const

export type NavigationTab = typeof NAV_ITEMS[number]['id']
