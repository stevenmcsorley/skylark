import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
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

const control = 'h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

interface IssuesPageProps {
  project: Project
  status: IssueStatusFilter
  query: string
  onStatus: (status: IssueStatusFilter) => void
  onQuery: (query: string) => void
  onOpen: (id: number) => void
}

export const sortIssues = (issues: Issue[], key: SortKey): Issue[] =>
  [...issues].sort((a, b) => key === 'count' ? b.count - a.count : (b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0))

export const IssuesPage = ({ project, status, query, onStatus, onQuery, onOpen }: IssuesPageProps) => {
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
      const data = await api(`/api/groups/?project=${encodeURIComponent(project.slug)}`)
      setIssues(Array.isArray(data) ? data : data?.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load issues')
    }
  }, [project.slug])

  useEffect(() => { setIssues(null); setShown(ISSUE_PAGE_SIZE); load() }, [load])
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

  return (
    <div className="space-y-4" data-testid="issues-page">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Issues</h1>
        <p className="mt-1 text-sm text-slate-400">Errors in <span className="font-mono text-slate-200">{project.slug}</span>, grouped by where they happen.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Issue status" className="inline-flex rounded-md border border-slate-700 p-0.5">
          {STATUS_TABS.map(tab => (
            <button key={tab.id} role="tab" type="button" aria-selected={status === tab.id} onClick={() => onStatus(tab.id)}
              data-testid={`issues-tab-${tab.id}`}
              className={`rounded px-3 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${status === tab.id ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab.label} <span className="tabular-nums text-slate-400">{issues ? counts[tab.id] : ''}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Search issues</span>
          <Icon icon={Search} size="sm" className="pointer-events-none absolute left-2.5 top-2 text-slate-400" />
          <input type="search" value={query} onChange={e => onQuery(e.target.value)} placeholder="Search by title or assignee"
            className={`${control} w-full pl-8`} data-testid="issues-search" />
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-400">
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
          {[0, 1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-800/50" />)}
        </div>
      ) : issues.length === 0 ? (
        <section className="space-y-4 rounded-lg border border-slate-800 p-5" data-testid="issues-empty">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Connect your first app</h2>
            <p className="mt-1 text-sm text-slate-400">No errors have arrived for this project yet. Add the snippet below to your app; issues appear here as soon as the first error is reported.</p>
          </div>
          <ConnectApp project={project} />
        </section>
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="No issues match" description="Try a different status or search term."
          action={<Button variant="secondary" size="sm" onClick={() => { onStatus('all'); onQuery('') }}>Clear filters</Button>} testId="issues-no-match" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm" data-testid="issues-table">
              <thead>
                {selected.size > 0 ? (
                  <tr className="border-b border-slate-800 bg-slate-800/60" data-testid="issues-bulk-bar" role="toolbar" aria-label="Bulk actions">
                    <th colSpan={7} className="px-3 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                          <span className="sr-only">Select all shown issues</span>
                          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} className="h-4 w-4 accent-emerald-600" data-testid="issues-select-all" />
                        </label>
                        <span className="mr-2 tabular-nums">{selected.size} selected</span>
                        <Button size="sm" variant="primary" disabled={busy} onClick={() => act([...selected], 'resolve')} data-testid="bulk-resolve">Resolve</Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act([...selected], 'ignore')} data-testid="bulk-ignore">Ignore</Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act([...selected], 'unresolve')} data-testid="bulk-reopen">Reopen</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                      </div>
                    </th>
                  </tr>
                ) : (
                <tr className="border-b border-slate-800">
                    <th className="w-10 pl-2">
                      <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                        <span className="sr-only">Select all shown issues</span>
                        <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} className="h-4 w-4 accent-emerald-600" data-testid="issues-select-all" />
                      </label>
                    </th>
                    <th className="w-full py-2.5">Issue</th>
                    <th className="hidden py-2.5 pl-4 md:table-cell">Level</th>
                    <th className="py-2.5 pl-3 text-right">Events</th>
                    <th className="hidden py-2.5 pl-6 sm:table-cell">Last seen</th>
                    {status === 'all' && <th className="hidden py-2.5 pl-6 md:table-cell">Status</th>}
                    <th className="hidden py-2.5 pl-6 pr-4 lg:table-cell">Assignee</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((issue, index) => (
                  <tr key={issue.id} aria-current={index === active ? 'true' : undefined}
                    className={`hover:bg-slate-800/40 ${index === active ? 'bg-slate-800/60' : ''} ${selected.has(issue.id) ? 'bg-slate-800/40' : ''}`} data-testid={`issue-row-${issue.id}`}>
                    <td className="pl-2">
                      <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
                        <span className="sr-only">Select {issue.title}</span>
                        <input type="checkbox" checked={selected.has(issue.id)} onChange={() => toggle(issue.id)} className="h-4 w-4 accent-emerald-600" data-testid={`issue-select-${issue.id}`} />
                      </label>
                    </td>
                    <td className="w-full max-w-0">
                      <div className="flex items-center gap-2">
                        <LevelBadge level={issue.level} variant="compact" testId={`issue-level-${issue.id}`} />
                        <a href={issueHref(project.slug, issue.id)} onClick={e => open(e, issue.id)}
                          className="block min-h-10 flex-1 truncate py-2.5 font-medium text-slate-100 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">{issue.title}</a>
                      </div>
                      <div className="-mt-1.5 pb-1.5 pl-4 text-xs text-slate-400 sm:hidden">{timeAgo(issue.last_seen)}{issue.assignee ? ` · ${issue.assignee}` : ''}</div>
                    </td>
                    <td className="hidden pl-4 text-slate-300 md:table-cell"><span className="capitalize">{issue.level}</span></td>
                    <td className="py-2 pl-3 text-right">
                      <div className="text-slate-200">{issue.count.toLocaleString()}</div>
                      <div className="ml-auto mt-1 h-1 w-16 rounded-full bg-slate-800" aria-hidden="true">
                        <div className="h-1 rounded-full bg-slate-500" style={{ width: `${Math.max(4, Math.round((issue.count / maxCount) * 100))}%` }} />
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap pl-6 text-slate-300 sm:table-cell" title={fmtDate(issue.last_seen)}>{timeAgo(issue.last_seen)}</td>
                    {status === 'all' && <td className="hidden whitespace-nowrap pl-6 md:table-cell"><StatusLabel status={issue.status} /></td>}
                    <td className="hidden w-40 max-w-[10rem] truncate pl-6 pr-4 text-slate-300 lg:table-cell">{issue.assignee || <span className="text-slate-400">Unassigned</span>}</td>
                  </tr>
                ))}
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
  )
}

export const StatusLabel = ({ status }: { status: Issue['status'] }) => (
  <span className={`inline-flex items-center gap-1 text-sm ${status === 'resolved' ? 'text-accent-400' : status === 'ignored' ? 'text-slate-400' : 'text-slate-300'}`}>
    {status === 'resolved' && <Icon icon={Check} size="xs" />}
    {status === 'ignored' && <Icon icon={EyeOff} size="xs" />}
    <span className="capitalize">{status}</span>
  </span>
)
