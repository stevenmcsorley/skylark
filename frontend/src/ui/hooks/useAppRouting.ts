import { NAV_ITEMS, resolveView } from '../navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { 
  Project, 
  NavigationTab, 
  TimeSelection, 
  CustomRangeType,
  TimeRange,
  TimeInterval
} from '../types/app.types'

export type IssueStatusFilter = 'unresolved' | 'resolved' | 'ignored' | 'all'
const ISSUE_STATUSES: IssueStatusFilter[] = ['unresolved', 'resolved', 'ignored', 'all']

interface RoutingState {
  activeTab: NavigationTab
  /** Sub-page of Apps (health, setup, ...) or Settings; empty on the Apps list. */
  section: string
  /** Inbox filter: one app's slug, or '' for every app. */
  inboxApp: string
  issue: number | null
  issueStatus: IssueStatusFilter
  issueQuery: string
  selected: Project | null
  search: string
  filterLevel: string
  filterEnv: string
  filterRelease: string
  timeSel: TimeSelection | null
  eventLimit: number
  eventOffset: number
  customRange: CustomRangeType | null
  range: TimeRange
  interval: TimeInterval
  initializedFromURL: boolean
}

interface RoutingActions {
  setActiveTab: (tab: NavigationTab) => void
  setSection: (section: string) => void
  setInboxApp: (slug: string) => void
  /** Go to one app, optionally to one of its sections. */
  openApp: (project: Project, section?: string) => void
  openIssue: (id: number | null) => void
  setIssueStatus: (status: IssueStatusFilter) => void
  setIssueQuery: (query: string) => void
  setSelected: (project: Project) => void
  setSearch: (search: string) => void
  setFilterLevel: (level: string) => void
  setFilterEnv: (env: string) => void
  setFilterRelease: (release: string) => void
  setTimeSel: (timeSel: TimeSelection | null) => void
  setEventLimit: (limit: number) => void
  setEventOffset: (offset: number) => void
  setCustomRange: (range: CustomRangeType | null) => void
  setRange: (range: TimeRange) => void
  setInterval: (interval: TimeInterval) => void
}

const resolveProject = (projects: Project[], slug: string | null) => {
  const requested = projects.find(project => project.slug === slug)
  if (requested) return requested
  try {
    const saved = localStorage.getItem('skylark-last-project')
    return projects.find(project => project.slug === saved) ?? projects[0] ?? null
  } catch {
    return projects[0] ?? null
  }
}

const ranges: TimeRange[] = ['1h', '24h', '7d', '14d', '30d', '90d', '1y']
const intervals: TimeInterval[] = ['1m', '5m', '15m', '30m', '1h', '24h', '7d', '30d']

const readRoute = (params: URLSearchParams, projects: Project[]): RoutingState => {
  const selected = resolveProject(projects, params.get('project'))
  const route = resolveView(params.get('view'))
  const value = Number(params.get('customValue'))
  const unit = params.get('customUnit')
  const label = params.get('customLabel')
  const from = params.get('from')
  const to = params.get('to')
  return {
    selected,
    activeTab: route?.view ?? 'inbox',
    section: params.get('tab') ?? route?.section ?? '',
    inboxApp: params.get('iapp') ?? '',
    issue: Number.parseInt(params.get('issue') ?? '', 10) || null,
    issueStatus: ISSUE_STATUSES.find(status => status === params.get('istatus')) ?? 'unresolved',
    issueQuery: params.get('iq') ?? '',
    search: params.get('q') ?? '',
    filterLevel: params.get('level') ?? '',
    filterEnv: params.get('env') ?? '',
    filterRelease: params.get('release') ?? '',
    timeSel: from && to ? { from, to } : null,
    eventLimit: parseInt(params.get('limit') ?? '', 10) || 50,
    eventOffset: parseInt(params.get('offset') ?? '', 10) || 0,
    customRange: value > 0 && unit && label ? { value, unit, label } : null,
    range: ranges.find(range => range === params.get('range')) ?? '24h',
    interval: intervals.find(interval => interval === params.get('interval')) ?? (selected ? '1h' : '5m'),
    initializedFromURL: Boolean(params.toString())
  }
}

export const useAppRouting = (projects: Project[]): RoutingState & RoutingActions => {
  // Keep the requested route until asynchronously loaded projects can resolve it.
  const [params, setParams] = useState(() => new URLSearchParams(window.location.hash.slice(1)))
  const [state, setState] = useState(() => readRoute(params, projects))
  const explicitView = useRef(resolveView(params.get('view')) !== null)

  useEffect(() => {
    const readHash = () => {
      const next = new URLSearchParams(window.location.hash.slice(1))
      explicitView.current = resolveView(next.get('view')) !== null
      setParams(next)
      setState(readRoute(next, projects))
    }
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [projects])

  useEffect(() => {
    if (state.selected || !projects.length) return
    const selected = resolveProject(projects, params.get('project'))
    setState(prev => ({ ...prev, selected, interval: params.has('interval') ? prev.interval : '1h' }))
  }, [projects, params, state.selected])

  useEffect(() => {
    document.title = NAV_ITEMS.find(item => item.id === state.activeTab)?.label + ' · Skylark'
  }, [state.activeTab])

  // Sync state to URL hash
  useEffect(() => {
    const pendingProject = params.get('project')
    const hash = new URLSearchParams()
    hash.set('view', state.activeTab)
    if (state.section) hash.set('tab', state.section)
    if (state.inboxApp) hash.set('iapp', state.inboxApp)
    
    if (state.selected) {
      hash.set('project', state.selected.slug)
      try { localStorage.setItem('skylark-last-project', state.selected.slug) } catch { /* Storage unavailable */ }
    }
    
    if (!state.selected && pendingProject) hash.set('project', pendingProject)
    if (state.issue) hash.set('issue', String(state.issue))
    if (state.issueStatus !== 'unresolved') hash.set('istatus', state.issueStatus)
    if (state.issueQuery) hash.set('iq', state.issueQuery)
    if (state.search) hash.set('q', state.search)
    if (state.filterLevel) hash.set('level', state.filterLevel)
    if (state.filterEnv) hash.set('env', state.filterEnv)
    if (state.filterRelease) hash.set('release', state.filterRelease)
    if (state.range !== '24h') hash.set('range', state.range)
    if (state.interval !== (state.selected ? '1h' : '5m')) hash.set('interval', state.interval)
    if (state.customRange) {
      hash.set('customValue', String(state.customRange.value))
      hash.set('customUnit', state.customRange.unit)
      hash.set('customLabel', state.customRange.label)
    }
    if (state.timeSel) {
      hash.set('from', state.timeSel.from)
      hash.set('to', state.timeSel.to)
    }
    if (state.eventLimit) hash.set('limit', String(state.eventLimit))
    if (state.eventOffset) hash.set('offset', String(state.eventOffset))
    
    const newHash = '#' + hash.toString()
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash)
    }
  }, [
    params,
    state.activeTab,
    state.section,
    state.inboxApp,
    state.issue,
    state.issueStatus,
    state.issueQuery,
    state.selected,
    state.search,
    state.filterLevel,
    state.filterEnv,
    state.filterRelease,
    state.range,
    state.interval,
    state.customRange,
    state.timeSel,
    state.eventLimit,
    state.eventOffset
  ])

  const setActiveTab = useCallback((activeTab: NavigationTab) => {
    explicitView.current = true
    if (activeTab === state.activeTab) return
    const next = new URLSearchParams(window.location.hash.slice(1))
    next.set('view', activeTab)
    next.delete('issue')   // leaving a view closes any open issue
    next.delete('tab')
    history.pushState(null, '', '#' + next.toString())
    setState(prev => ({ ...prev, activeTab, issue: null, section: '' }))
  }, [state.activeTab])

  const setSection = useCallback((section: string) => {
    const next = new URLSearchParams(window.location.hash.slice(1))
    if (section) next.set('tab', section); else next.delete('tab')
    history.pushState(null, '', '#' + next.toString())
    setState(prev => (prev.section === section ? prev : { ...prev, section }))
  }, [])

  const setInboxApp = useCallback((inboxApp: string) => {
    setState(prev => (prev.inboxApp === inboxApp ? prev : { ...prev, inboxApp }))
  }, [])

  const openApp = useCallback((project: Project, section = 'health') => {
    explicitView.current = true
    const next = new URLSearchParams(window.location.hash.slice(1))
    next.set('view', 'apps'); next.set('project', project.slug); next.set('tab', section); next.delete('issue')
    history.pushState(null, '', '#' + next.toString())
    setState(prev => ({ ...prev, activeTab: 'apps', selected: project, section, issue: null, eventOffset: 0 }))
  }, [])

  // Opening an issue is a navigation (Back returns to the list); changing the list's filters is not.
  const openIssue = useCallback((issue: number | null) => {
    const next = new URLSearchParams(window.location.hash.slice(1))
    if (issue) next.set('issue', String(issue)); else next.delete('issue')
    next.set('view', 'inbox')
    next.delete('tab')
    history.pushState(null, '', '#' + next.toString())
    setState(prev => ({ ...prev, activeTab: 'inbox', section: '', issue }))
  }, [])

  const setIssueStatus = useCallback((issueStatus: IssueStatusFilter) => {
    setState(prev => (prev.issueStatus === issueStatus ? prev : { ...prev, issueStatus }))
  }, [])

  const setIssueQuery = useCallback((issueQuery: string) => {
    setState(prev => (prev.issueQuery === issueQuery ? prev : { ...prev, issueQuery }))
  }, [])

  const setSelected = useCallback((selected: Project) => {
    setState(prev => (prev.selected === selected ? prev : { ...prev, selected, eventOffset: 0 }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setState(prev => (prev.search === search ? prev : { ...prev, search, eventOffset: 0 }))
  }, [])

  const setFilterLevel = useCallback((filterLevel: string) => {
    setState(prev => (prev.filterLevel === filterLevel ? prev : { ...prev, filterLevel, eventOffset: 0 }))
  }, [])

  const setFilterEnv = useCallback((filterEnv: string) => {
    setState(prev => (prev.filterEnv === filterEnv ? prev : { ...prev, filterEnv, eventOffset: 0 }))
  }, [])

  const setFilterRelease = useCallback((filterRelease: string) => {
    setState(prev => (prev.filterRelease === filterRelease ? prev : { ...prev, filterRelease, eventOffset: 0 }))
  }, [])

  const setTimeSel = useCallback((timeSel: TimeSelection | null) => {
    setState(prev => (prev.timeSel === timeSel ? prev : { ...prev, timeSel, eventOffset: 0 }))
  }, [])

  const setEventLimit = useCallback((eventLimit: number) => {
    setState(prev => ({ ...prev, eventLimit }))
  }, [])

  const setEventOffset = useCallback((eventOffset: number) => {
    setState(prev => ({ ...prev, eventOffset }))
  }, [])

  const setCustomRange = useCallback((customRange: CustomRangeType | null) => {
    setState(prev => (prev.customRange === customRange ? prev : { ...prev, customRange, eventOffset: 0 }))
  }, [])

  const setRange = useCallback((range: TimeRange) => {
    setState(prev => (prev.range === range ? prev : { ...prev, range, eventOffset: 0 }))
  }, [])

  const setInterval = useCallback((interval: TimeInterval) => {
    setState(prev => ({ ...prev, interval }))
  }, [])

  return {
    ...state,
    setActiveTab,
    setSection,
    setInboxApp,
    openApp,
    openIssue,
    setIssueStatus,
    setIssueQuery,
    setSelected,
    setSearch,
    setFilterLevel,
    setFilterEnv,
    setFilterRelease,
    setTimeSel,
    setEventLimit,
    setEventOffset,
    setCustomRange,
    setRange,
    setInterval
  }
}