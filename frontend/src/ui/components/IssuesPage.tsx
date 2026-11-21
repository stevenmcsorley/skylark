import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { Check, CircleAlert, CircleCheck, EyeOff, Search } from 'lucide-react'
import { api } from '../utils/api.utils'
import { fmtDate, timeAgo } from '../utils/date.utils'
import type { Project } from '../types/app.types'
import type { Issue } from '../types/issue.types'
import type { IssueStatusFilter } from '../hooks/useAppRouting'
import { ConnectApp } from './ConnectApp'
import { LevelBadge } from './LevelBadge'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'
import { Icon } from './ui/Icon'
import { PageHeader } from './ui/PageHeader'
import { OverviewStatus } from './OverviewStatus'
import { TicketDialog } from './TicketDialog'

export const ISSUE_PAGE_SIZE = 50
type SortKey = 'last_seen' | 'first_seen' | 'count'

const STATUS_TABS: Array<{ id: IssueStatusFilter; label: string }> = [
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'ignored', label: 'Ignored' },
  { id: 'all', label: 'All' },
]

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: 'last_seen', label: 'Last seen' },
  { id: 'first_seen', label: 'First seen' },
  { id: 'count', label: 'Events' },
]

export const issueHref = (slug: string, id: number) => `#view=issues&project=${encodeURIComponent(slug)}&issue=${id}`

const control = 'h-9 rounded-md border border-slate-500 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-400'

interface IssuesPageProps {
  projects: Project[]
  /** One app's slug, or '' for every app. */
  app: string
  status: IssueStatusFilter
  query: string
  onApp: (slug: string) => void
  onStatus: (status: IssueStatusFilter) => void
  onQuery: (query: string) => void
  onOpen: (id: number) => void
  onCreateApp?: (name: string) => Promise<void> | void
}

const DAY = 24 * 60 * 60 * 1000

/** "Regressed" if a new event reopened it, "New" if first seen in the last day. */
export const issueFlag = (issue: Issue, now = Date.now()): 'Regressed' | 'New' | null => {
  if (issue.status !== 'unresolved') return null
  if (issue.regressed_at) return 'Regressed'
  return now - new Date(issue.first_seen).getTime() < DAY ? 'New' : null
}

export const sortIssues = (issues: Issue[], key: SortKey): Issue[] =>
  [...issues].sort((a, b) => key === 'count' ? b.count - a.count : (b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0))

export const IssuesPage = ({ projects, app, status, query, onApp, onStatus, onQuery, onOpen, onCreateApp }: IssuesPageProps) => {
  const project = projects.find(p => p.slug === app) ?? null
  const byId = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])
  const [providers, setProviders] = useState<string[]>([])
  const [ticketFor, setTicketFor] = useState<{ id: number; title: string } | null>(null)
  const [newApp, setNewApp] = useState('')
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('last_seen')
  const [shown, setShown] = useState(ISSUE_PAGE_SIZE)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [active, setActive] = useState(-1)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api(app ? `/api/groups/?project=${encodeURIComponent(app)}` : '/api/groups/')
      if (!mounted.current) return
      setIssues(Array.isArray(data) ? data : data?.results ?? [])
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not load issues')
    }
  }, [app])

  useEffect(() => { setIssues(null); setShown(ISSUE_PAGE_SIZE); load() }, [load, projects.length])
  useEffect(() => {
    let live = true
    api('/api/integrations/').then((d: any) => { if (live) setProviders((d.integrations || []).map((i: any) => i.provider)) }).catch(() => { if (live) setProviders([]) })
    return () => { live = false }
  }, [])
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { setShown(ISSUE_PAGE_SIZE); setSelected(new Set()); setActive(-1) }, [status, query, sort])

  const counts = useMemo(() => {
    const c = { unresolved: 0, resolved: 0, ignored: 0, all: 0 }
    for (const issue of issues ?? []) { c[issue.status] += 1; c.all += 1 }
    return c
  }, [issues])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matching = (issues ?? []).filter(issue =>
      (status === 'all' || issue.status === status) &&
      (!needle || issue.title.toLowerCase().includes(needle) || issue.assignee.toLowerCase().includes(needle)))
    return sortIssues(matching, sort)
  }, [issues, status, query, sort])

  const open = (event: MouseEvent<HTMLAnchorElement>, id: number) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen(id)
  }

  const maxCount = useMemo(() => Math.max(1, ...visible.map(i => i.count)), [visible])
  const rows = visible.slice(0, shown)

  const act = useCallback(async (ids: number[], verb: 'resolve' | 'ignore' | 'unresolve') => {
    if (!ids.length) return
    setBusy(true)
    try {
      await Promise.all(ids.map(id => api(`/api/groups/${id}/${verb}/`, { method: 'POST' })))
      setSelected(new Set())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update issues')
    } finally {
      setBusy(false)
    }
  }, [load])

  const toggle = (id: number) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  const picked = rows.filter(r => selected.has(r.id))
  const canResolve = picked.some(r => r.status !== 'resolved')
  const canIgnore = picked.some(r => r.status !== 'ignored')
  const canReopen = picked.some(r => r.status !== 'unresolved')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey || (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName)))) return
      if (!rows.length) return
      if (e.key === 'j') { e.preventDefault(); setActive(i => Math.min(rows.length - 1, i + 1)) }
      else if (e.key === 'k') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
      else if (active >= 0 && active < rows.length) {
        const row = rows[active]
        if (e.key === 'Enter') { e.preventDefault(); onOpen(row.id) }
        else if (e.key === 'x') { e.preventDefault(); toggle(row.id) }
        else if (e.key === 'e') { e.preventDefault(); act([row.id], row.status === 'unresolved' ? 'resolve' : 'unresolve') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, active, onOpen, act])

  const slugOf = (issue: Issue) => byId.get(issue.project)?.slug ?? app
  const scopeName = project ? project.name : 'any app'
  const createApp = async (e: FormEvent) => {
    e.preventDefault()
    const name = newApp.trim()
    if (!name || !onCreateApp) return
    await onCreateApp(name)
    setNewApp('')
  }

  return (
    <div data-testid="issues-page">
      <PageHeader title="Inbox" purpose="What needs you now, across every app." testId="inbox-header" />

      {projects.length === 0 ? (
        <section className="rounded-lg border border-slate-700 bg-slate-950 p-6" data-testid="inbox-first-run">
          <h2 className="text-lg font-semibold text-slate-100">Start by adding an app</h2>
          <p className="mt-1 max-w-[60ch] text-sm text-slate-300">An app is anything that sends errors: a website, an API, a script. Name it, paste one snippet into it, and its errors appear here.</p>
          <form onSubmit={createApp} className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="first-app-name">App name</label>
            <input id="first-app-name" value={newApp} onChange={e => setNewApp(e.target.value)} placeholder="App name, e.g. billing-api" className={`${control} w-64`} autoComplete="off" data-testid="first-app-name" />
            <Button type="submit" size="md" variant="primary" disabled={!newApp.trim()} testId="first-app-create">Create app</Button>
          </form>
          <p className="mt-4 text-sm text-slate-400"><a href="#view=settings&tab=help" className="text-slate-100 underline underline-offset-2">How Skylark works</a></p>
        </section>
      ) : (
        <div className="space-y-4">
          <OverviewStatus slugs={project ? [project.slug] : projects.map(p => p.slug)} scope={scopeName} groups={issues ?? []} />

          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Issue status" className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5">
              {STATUS_TABS.map(tab => (
                <button key={tab.id} role="tab" type="button" aria-selected={status === tab.id} onClick={() => onStatus(tab.id)}
                  data-testid={`issues-tab-${tab.id}`}
                  className={`rounded px-3 py-1.5 text-sm ${status === tab.id ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-slate-100'}`}>
                  {tab.label} <span className={`tabular-nums ${status === tab.id ? 'text-slate-600' : 'text-slate-400'}`}>{issues ? counts[tab.id] : ''}</span>
                </button>
              ))}
            </div>
            {projects.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <span className="sr-only sm:not-sr-only">App</span>
                <select value={app} onChange={e => onApp(e.target.value)} className={control} data-testid="inbox-app-filter">
                  <option value="">All apps</option>
                  {projects.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
                </select>
              </label>
            )}
            <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <span className="sr-only">Search issues</span>
              <Icon icon={Search} size="sm" className="pointer-events-none absolute left-2.5 top-2 text-slate-400" />
              <input type="search" value={query} onChange={e => onQuery(e.target.value)} placeholder="Search issues"
                className={`${control} w-full pl-8`} data-testid="issues-search" />
            </label>
            <label className="ml-auto hidden items-center gap-2 text-sm text-slate-400 sm:flex">
              Sort
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={control} data-testid="issues-sort">
                {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {error ? (
            <EmptyState icon={CircleAlert} title="Could not load issues" description={error}
              action={<Button variant="secondary" size="sm" onClick={load}>Try again</Button>} testId="issues-error" />
          ) : issues === null ? (
            <div className="space-y-2" aria-busy="true" data-testid="issues-loading">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-800/60" />)}
            </div>
          ) : issues.length === 0 ? (
            <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950 p-5" data-testid="issues-empty">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Waiting for the first error</h2>
                <p className="mt-1 max-w-[60ch] text-sm text-slate-300">Nothing has arrived{project ? ` from ${project.name}` : ''} yet. Add the snippet to your app and send a test event; the error appears here the moment it lands. <a href="#view=settings&tab=help" className="text-slate-100 underline underline-offset-2">How Skylark works</a></p>
              </div>
              {(project ?? projects[0]) && <ConnectApp project={(project ?? projects[0])} />}
            </section>
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} title="No issues match" description="Try a different status or search term."
              action={<Button variant="secondary" size="sm" onClick={() => { onStatus('all'); onQuery('') }}>Clear filters</Button>} testId="issues-no-match" />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                <table className="w-full text-sm" data-testid="issues-table">
                  <thead>
                    {selected.size > 0 ? (
                      <tr className="h-12 border-b border-slate-700 bg-slate-800" data-testid="issues-bulk-bar" role="toolbar" aria-label="Bulk actions">
                        <th colSpan={8} className="px-3 py-1.5 text-sm font-normal text-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                              <span className="sr-only">Select all shown issues</span>
                              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} className="h-4 w-4 accent-slate-100" data-testid="issues-select-all" />
                            </label>
                            <span className="mr-2 tabular-nums">{selected.size} selected</span>
                            {canResolve && <Button size="md" variant="primary" disabled={busy} onClick={() => act([...selected], 'resolve')} data-testid="bulk-resolve">Resolve</Button>}
                            {canIgnore && <Button size="md" variant="secondary" disabled={busy} onClick={() => act([...selected], 'ignore')} data-testid="bulk-ignore">Ignore</Button>}
                            {canReopen && <Button size="md" variant="secondary" disabled={busy} onClick={() => act([...selected], 'unresolve')} data-testid="bulk-reopen">Reopen</Button>}
                            <Button size="md" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                          </div>
                        </th>
                      </tr>
                    ) : (
                      <tr className="h-12 border-b border-slate-700">
                        <th className="w-10 pl-2">
                          <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                            <span className="sr-only">Select all shown issues</span>
                            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} className="h-4 w-4 accent-slate-100" data-testid="issues-select-all" />
                          </label>
                        </th>
                        <th className="w-full py-2.5">Issue</th>
                        <th className="hidden py-2.5 pl-4 md:table-cell">Level</th>
                        {!app && <th className="hidden py-2.5 pl-4 lg:table-cell">App</th>}
                        <th className="hidden py-2.5 pl-3 text-right sm:table-cell" title="Total occurrences, including events no longer stored">Total events</th>
                        <th className="hidden py-2.5 pl-6 sm:table-cell">Last seen</th>
                        {status === 'all' && <th className="hidden py-2.5 pl-6 md:table-cell">Status</th>}
                        <th className="hidden py-2.5 pl-6 lg:table-cell">Assignee</th>
                        <th className="hidden py-2.5 pr-3 text-right md:table-cell"><span className="sr-only">Actions</span></th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {rows.map((issue, index) => {
                      const flag = issueFlag(issue)
                      return (
                        <tr key={issue.id} aria-current={index === active ? 'true' : undefined}
                          className={`hover:bg-slate-900 ${index === active ? 'bg-slate-900' : ''} ${selected.has(issue.id) ? 'bg-slate-800/60' : ''}`} data-testid={`issue-row-${issue.id}`}>
                          <td className="pl-2">
                            <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                              <span className="sr-only">Select {issue.title}</span>
                              <input type="checkbox" checked={selected.has(issue.id)} onChange={() => toggle(issue.id)} className="h-4 w-4 accent-slate-100" data-testid={`issue-select-${issue.id}`} />
                            </label>
                          </td>
                          <td className="w-full max-w-0">
                            <div className="flex items-center gap-2">
                              <LevelBadge level={issue.level} variant="compact" testId={`issue-level-${issue.id}`} />
                              <a href={issueHref(slugOf(issue), issue.id)} onClick={e => open(e, issue.id)}
                                className="block min-h-10 flex-1 py-2.5 font-medium text-slate-100 hover:underline max-sm:line-clamp-2 sm:truncate">{issue.title}</a>
                              {flag && <span className={`shrink-0 text-xs font-semibold ${flag === 'Regressed' ? 'text-red-400' : 'text-slate-100'}`} data-testid={`issue-flag-${issue.id}`}>{flag}</span>}
                            </div>
                            <div className="-mt-1.5 pb-1.5 pl-4 text-xs tabular-nums text-slate-400 sm:hidden"><span className="capitalize">{issue.level}</span> · {issue.count.toLocaleString()} events · {timeAgo(issue.last_seen)}{issue.assignee ? ` · ${issue.assignee}` : ''}</div>
                          </td>
                          <td className="hidden whitespace-nowrap pl-4 capitalize text-slate-300 md:table-cell">{issue.level}</td>
                          {!app && <td className="hidden whitespace-nowrap pl-4 text-slate-300 lg:table-cell">{byId.get(issue.project)?.name ?? ''}</td>}
                          <td className="hidden py-2 pl-3 text-right sm:table-cell">
                            <div className="tabular-nums text-slate-100">{issue.count.toLocaleString()}</div>
                            <div className="ml-auto mt-1 h-1 w-16 rounded-full bg-slate-800" aria-hidden="true">
                              <div className="h-1 rounded-full bg-slate-400" style={{ width: `${Math.max(4, Math.round((issue.count / maxCount) * 100))}%` }} />
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap pl-6 text-slate-300 sm:table-cell" title={fmtDate(issue.last_seen)}>{timeAgo(issue.last_seen)}</td>
                          {status === 'all' && <td className="hidden whitespace-nowrap pl-6 md:table-cell"><StatusLabel status={issue.status} /></td>}
                          <td className="hidden w-36 max-w-[9rem] truncate pl-6 text-slate-300 lg:table-cell">{issue.assignee || <span className="text-slate-400">Unassigned</span>}</td>
                          <td className="hidden whitespace-nowrap py-1 pl-3 pr-3 text-right md:table-cell">
                            {issue.status === 'unresolved' && <Button size="md" variant="ghost" disabled={busy} onClick={() => act([issue.id], 'resolve')} data-testid={`row-resolve-${issue.id}`}>Resolve</Button>}
                            <Button size="md" variant="ghost" onClick={() => setTicketFor({ id: issue.id, title: issue.title })} data-testid={`row-handoff-${issue.id}`}>Hand off</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span className="tabular-nums">Showing {Math.min(shown, visible.length)} of {visible.length}<span className="ml-4 hidden text-slate-400 md:inline">j / k move · Enter open · x select · e resolve or reopen</span></span>
                {visible.length > shown && <Button variant="secondary" size="sm" onClick={() => setShown(n => n + ISSUE_PAGE_SIZE)}>Show more</Button>}
              </div>
            </>
          )}
        </div>
      )}
      <TicketDialog issue={ticketFor} providers={providers} onClose={() => setTicketFor(null)} />
    </div>
  )
}

export const StatusLabel = ({ status }: { status: Issue['status'] }) => (
  <span className="inline-flex items-center gap-1 text-sm text-slate-300">
    {status === 'resolved' && <Icon icon={Check} size="xs" />}
    {status === 'ignored' && <Icon icon={EyeOff} size="xs" />}
    <span className="capitalize">{status}</span>
  </span>
)
