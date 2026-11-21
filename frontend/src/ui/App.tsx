import { useState, useCallback } from 'react'

// Types
import type {
  EventDetails,
  EditRuleState
} from './types/app.types'

// Components
import { Dashboard } from './Dashboard'
import { OverviewPage } from './components/OverviewPage'
import { IssuesPage } from './components/IssuesPage'
import { IssueDetail } from './components/IssueDetail'
import { TopNav } from './components/TopNav'
import { AppsPage } from './components/AppsPage'
import { AppDetail, AppSetup } from './components/AppDetail'
import { SettingsPage } from './components/SettingsPage'
import { LogsView } from './components/LogsView'
import { ReleasesPage } from './components/ReleasesPage'
import { AlertsPage } from './components/AlertsPage'
import { ToastProvider } from './components/ui'
import { NoProjectSelected } from './components/ui'
import { PageHeader } from './components/ui/PageHeader'
import { McpPage } from './components/McpPage'
import { IntegrationsPage } from './components/IntegrationsPage'
import { HelpPage } from './components/HelpPage'

// Hooks
import { useProjects } from './hooks/useProjects'
import { useAppRouting } from './hooks/useAppRouting'
import { useProjectData } from './hooks/useProjectData'
import { useProjectService } from './hooks/useProjectService'
import { useEventService } from './hooks/useEventService'
import { useReleaseService } from './hooks/useReleaseService'
import { useAlertService } from './hooks/useAlertService'
import { useEstate } from './hooks/useEstate'


interface AppState {
  sessionUser: string
  eventDetails: EventDetails
  editRule: EditRuleState
}

const initialState: AppState = {
  sessionUser: 'user-123',
  eventDetails: {},
  editRule: { threshold: 10, window: 5, notify: 60 }
}

export const App = () => {
  const { projects, reload } = useProjects()
  const [state, setState] = useState<AppState>(initialState)
  const { estate, reload: reloadEstate } = useEstate(projects.length)
  
  // Use routing hook for all URL/routing state
  const routing = useAppRouting(projects)
  
  // Use data hook for all project data fetching
  const projectData = useProjectData({
    selected: routing.selected,
    filterLevel: routing.filterLevel,
    filterEnv: routing.filterEnv,
    filterRelease: routing.filterRelease,
    search: routing.search,
    timeSel: routing.timeSel,
    eventLimit: routing.eventLimit,
    eventOffset: routing.eventOffset,
    activeTab: routing.activeTab,
    customRange: routing.customRange,
    range: routing.range,
    interval: routing.interval
  })

  // Service hooks for business logic
  const projectService = useProjectService({
    onProjectCreated: routing.setSelected,
    onReload: reload
  })

  const eventService = useEventService({
    selected: routing.selected,
    msg: 'Real-time event monitoring',
    releases: projectData.releases,
    onRefetch: projectData.refetch,
    onEventDetailsUpdate: (id, details) => {
      setState(prev => ({
        ...prev,
        eventDetails: { ...prev.eventDetails, [id]: details }
      }))
    }
  })

  const releaseService = useReleaseService({
    selected: routing.selected,
    releases: projectData.releases,
    sessionUser: state.sessionUser,
    range: routing.range,
    interval: routing.interval,
    onRefetch: projectData.refetch
  })

  const alertService = useAlertService({
    selected: routing.selected,
    rules: projectData.rules,
    editRule: state.editRule,
    onRefetch: projectData.refetch
  })

  const refreshSeries = useCallback(() => {
    if (!routing.selected) return
    projectData.refetch()
  }, [routing.selected, projectData])


  // Simple state setters for non-routing state
  const setSessionUser = useCallback((sessionUser: string) => {
    setState(prev => ({ ...prev, sessionUser }))
  }, [])

  const setEditRule = useCallback((editRule: EditRuleState) => {
    setState(prev => ({ ...prev, editRule }))
  }, [])


  const createApp = async (name: string) => {
    await projectService.createProject(name)
    reloadEstate()
  }

  const openApp = (slug: string, section?: string) => {
    const project = projects.find(p => p.slug === slug)
    if (project) routing.openApp(project, section)
  }

  const healthPage = (selected: NonNullable<typeof routing.selected>) => (
    <OverviewPage
      selected={selected}
      releases={projectData.releases}
      createRelease={releaseService.createRelease}
      deploys={projectData.deploys}
      createDeployment={releaseService.createDeployment}
      sessionUser={state.sessionUser}
      setSessionUser={setSessionUser}
      sendSession={releaseService.sendSession}
      range={routing.range}
      setRange={routing.setRange}
      interval={routing.interval}
      setInterval={routing.setInterval}
      refreshSeries={refreshSeries}
      series={projectData.series}
      health={projectData.health}
      rules={projectData.rules}
      createRule={alertService.createRule}
      editRule={state.editRule}
      setEditRule={setEditRule}
      updateFirstRule={alertService.updateFirstRule}
      groups={projectData.groups}
      setGroups={() => {}}
      snoozeGroup={alertService.snoozeGroup}
    />
  )

  const selected = routing.selected

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
        <TopNav activeTab={routing.activeTab} onChange={routing.setActiveTab} inboxCount={estate?.totals.unresolved_total ?? 0} />
        <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6" id="main">
          {routing.activeTab === 'inbox' ? (
            routing.issue
              ? <IssueDetail issueId={routing.issue} onBack={() => routing.openIssue(null)} />
              : <IssuesPage projects={projects} app={routing.inboxApp} status={routing.issueStatus} query={routing.issueQuery}
                  onApp={routing.setInboxApp} onStatus={routing.setIssueStatus} onQuery={routing.setIssueQuery} onOpen={routing.openIssue} onCreateApp={createApp} />
          ) : routing.activeTab === 'apps' ? (
            routing.section && selected ? (
              <AppDetail
                project={selected}
                section={routing.section}
                onSection={routing.setSection}
                onBack={() => routing.setActiveTab('apps')}
                render={section => section === 'setup' ? <AppSetup project={selected} />
                  : section === 'releases' ? <ReleasesPage selected={selected} releases={projectData.releases} onReleaseCreated={projectData.refetch} />
                  : section === 'alerts' ? <AlertsPage selected={selected} rules={projectData.rules} onRuleCreated={projectData.refetch} />
                  : section === 'charts' ? <Dashboard onOpenProjects={() => routing.setActiveTab('apps')} projectSlug={selected.slug} fromTo={routing.timeSel || undefined} />
                  : healthPage(selected)}
              />
            ) : (
              <AppsPage estate={estate} onOpen={openApp} onCreate={createApp} />
            )
          ) : routing.activeTab === 'explore' ? (
            <div data-testid="explore-page" className="min-w-0 [&>*]:max-w-full overflow-x-auto">
              <PageHeader title="Explore" purpose="Search every event and read its raw payload." />
              {selected ? (
                <LogsView
                  selected={selected}
                  projects={projects}
                  setSelected={routing.setSelected}
                  search={routing.search}
                  setSearch={routing.setSearch}
                  filterLevel={routing.filterLevel}
                  setFilterLevel={routing.setFilterLevel}
                  filterEnv={routing.filterEnv}
                  setFilterEnv={routing.setFilterEnv}
                  filterRelease={routing.filterRelease}
                  setFilterRelease={routing.setFilterRelease}
                  events={projectData.events}
                  onView={eventService.fetchEvent}
                  eventDetails={state.eventDetails}
                  range={routing.range}
                  interval={routing.interval}
                  setRange={routing.setRange}
                  setInterval={routing.setInterval}
                  timeSel={routing.timeSel}
                  setTimeSel={routing.setTimeSel}
                  eventLimit={routing.eventLimit}
                  setEventLimit={routing.setEventLimit}
                  eventOffset={routing.eventOffset}
                  setEventOffset={routing.setEventOffset}
                  eventTotal={projectData.eventTotal}
                  customRange={routing.customRange}
                  setCustomRange={routing.setCustomRange}
                  onNewRealtimeEvent={projectData.addRealtimeEvent}
                />
              ) : (
                <NoProjectSelected testId="logs-no-project" />
              )}
            </div>
          ) : (
            <SettingsPage
              section={routing.section}
              onSection={routing.setSection}
              render={section => section === 'integrations' ? <IntegrationsPage /> : section === 'help' ? <HelpPage /> : <McpPage />}
            />
          )}
        </main>
      </div>
    </ToastProvider>
  )
}
