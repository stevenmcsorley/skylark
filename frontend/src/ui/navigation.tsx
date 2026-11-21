/**
 * Four places, each with one job:
 *   Inbox     what needs you right now, across every app
 *   Apps      one app at a time: its health, setup, releases and alert rules
 *   Explore   search and slice every raw event
 *   Settings  agents and API, integrations, help
 */
export const NAV_ITEMS = [
  { id: 'inbox', label: 'Inbox', purpose: 'What needs you right now, across every app.' },
  { id: 'apps', label: 'Apps', purpose: 'Each app’s health, setup, releases and alert rules.' },
  { id: 'explore', label: 'Explore', purpose: 'Search and slice every event.' },
  { id: 'settings', label: 'Settings', purpose: 'Agents and API, integrations and help.' },
] as const

export type NavigationTab = typeof NAV_ITEMS[number]['id']

export const APP_SECTIONS = [
  { id: 'health', label: 'Health' },
  { id: 'setup', label: 'Setup' },
  { id: 'releases', label: 'Releases' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'charts', label: 'Charts' },
] as const
export type AppSection = typeof APP_SECTIONS[number]['id']

export const SETTINGS_SECTIONS = [
  { id: 'agents', label: 'Agents and API' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'help', label: 'Help' },
] as const
export type SettingsSection = typeof SETTINGS_SECTIONS[number]['id']

/** Addresses from before the restructure keep working: each old view maps to a page and a section. */
export const LEGACY_VIEWS: Record<string, { view: NavigationTab; section?: string }> = {
  estate: { view: 'apps' },
  projects: { view: 'apps' },
  overview: { view: 'apps', section: 'health' },
  issues: { view: 'inbox' },
  logs: { view: 'explore' },
  dashboard: { view: 'apps', section: 'charts' },
  releases: { view: 'apps', section: 'releases' },
  alerts: { view: 'apps', section: 'alerts' },
  mcp: { view: 'settings', section: 'agents' },
  integrations: { view: 'settings', section: 'integrations' },
  help: { view: 'settings', section: 'help' },
}

export const resolveView = (view: string | null): { view: NavigationTab; section?: string } | null => {
  if (!view) return null
  const direct = NAV_ITEMS.find(item => item.id === view)
  if (direct) return { view: direct.id }
  return LEGACY_VIEWS[view] ?? null
}
