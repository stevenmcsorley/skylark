import { Bot, Bell, CircleAlert, CircleHelp, FolderKanban, Gauge, House, LayoutDashboard, Link2, Package, Search } from 'lucide-react'
import { Icon } from './components/ui/Icon'
import type { IconComponent } from './components/ui/Icon'

const nav = (glyph: IconComponent) => () => <Icon icon={glyph} size="md" />
const Estate = nav(LayoutDashboard)
const Home = nav(House)
const Issues = nav(CircleAlert)
const Explore = nav(Search)
const Dashboards = nav(Gauge)
const Folder = nav(FolderKanban)
const Releases = nav(Package)
const Alerts = nav(Bell)
const Integrations = nav(Link2)
const Agent = nav(Bot)
const Help = nav(CircleHelp)

export const NAV_ITEMS = [
  { id: 'estate', label: 'All projects', description: 'View the project estate', icon: Estate, group: '' },
  { id: 'overview', label: 'Overview', description: 'View project health', icon: Home, group: 'Monitor' },
  { id: 'issues', label: 'Issues', description: 'Inspect grouped errors', icon: Issues, group: 'Monitor' },
  { id: 'logs', label: 'Explore', description: 'Search events and logs', icon: Explore, group: 'Monitor' },
  { id: 'dashboard', label: 'Dashboards', description: 'View project metrics', icon: Dashboards, group: 'Monitor' },
  { id: 'projects', label: 'Projects', description: 'Manage projects', icon: Folder, group: 'Manage' },
  { id: 'releases', label: 'Releases', description: 'Track deployments', icon: Releases, group: 'Manage' },
  { id: 'alerts', label: 'Alerts', description: 'Manage alert rules', icon: Alerts, group: 'Manage' },
  { id: 'integrations', label: 'Integrations', description: 'Connect services', icon: Integrations, group: 'Manage' },
  { id: 'mcp', label: 'MCP & API', description: 'Connect API clients and agents', icon: Agent, group: 'Connect' },
  { id: 'help', label: 'Help', description: 'Read Skylark help', icon: Help, group: 'Connect' },
] as const

export type NavigationTab = typeof NAV_ITEMS[number]['id']
