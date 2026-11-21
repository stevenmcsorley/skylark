import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { Check, CircleAlert, CircleCheck, EyeOff, Search } from 'lucide-react'
import { api } from '../utils/api.utils'
import { fmtDate, timeAgo } from '../utils/date.utils'
import type { Project } from '../types/app.types'
import type { Issue } from '../types/issue.types'
import type { IssueStatusFilter } from '../hooks/useAppRouting'
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

const control = 'h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

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
  useEffect(() => { setShown(ISSUE_PAGE_SIZE) }, [status, query, sort])

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
              className={`rounded px-3 py-1 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${status === tab.id ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab.label} <span className="tabular-nums text-slate-500">{issues ? counts[tab.id] : ''}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Search issues</span>
          <Icon icon={Search} size="sm" className="pointer-events-none absolute left-2.5 top-2 text-slate-500" />
          <input type="search" value={query} onChange={e => onQuery(e.target.value)} placeholder="Search by title or assignee"
            className={`${control} w-full pl-8`} data-testid="issues-search" />
        </label>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-400">
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
        <EmptyState icon={CircleCheck} title="No issues yet"
          description="Errors sent to this project show up here, grouped by cause. Connect an app from the Projects page to start receiving them."
          action={<a href={`#view=projects&project=${encodeURIComponent(project.slug)}`} className="text-sm text-accent-400 hover:underline">Open Projects</a>} testId="issues-empty" />
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="No issues match" description="Try a different status or search term."
          action={<Button variant="secondary" size="sm" onClick={() => { onStatus('all'); onQuery('') }}>Clear filters</Button>} testId="issues-no-match" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm" data-testid="issues-table">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="w-full py-2.5 pl-4">Issue</th>
                  <th className="py-2.5 pl-3 text-right">Events</th>
                  <th className="hidden py-2.5 pl-6 sm:table-cell">Last seen</th>
                  <th className="hidden py-2.5 pl-6 md:table-cell">Status</th>
                  <th className="hidden py-2.5 pl-6 pr-4 lg:table-cell">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visible.slice(0, shown).map(issue => (
                  <tr key={issue.id} className="hover:bg-slate-800/40" data-testid={`issue-row-${issue.id}`}>
                    <td className="w-full max-w-0 py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <LevelBadge level={issue.level} variant="compact" testId={`issue-level-${issue.id}`} />
                        <a href={issueHref(project.slug, issue.id)} onClick={e => open(e, issue.id)}
                          className="truncate font-medium text-slate-100 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">{issue.title}</a>
                      </div>
                      <div className="mt-0.5 pl-4 text-xs text-slate-500 sm:hidden">{timeAgo(issue.last_seen)}{issue.assignee ? ` · ${issue.assignee}` : ''}</div>
                    </td>
                    <td className="py-2.5 pl-3 text-right text-slate-200">{issue.count.toLocaleString()}</td>
                    <td className="hidden whitespace-nowrap py-2.5 pl-6 text-slate-400 sm:table-cell" title={fmtDate(issue.last_seen)}>{timeAgo(issue.last_seen)}</td>
                    <td className="hidden whitespace-nowrap py-2.5 pl-6 md:table-cell"><StatusLabel status={issue.status} /></td>
                    <td className="hidden w-40 max-w-[10rem] truncate py-2.5 pl-6 pr-4 text-slate-400 lg:table-cell">{issue.assignee || <span className="text-slate-600">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-[13px] text-slate-500">
            <span className="tabular-nums">Showing {Math.min(shown, visible.length)} of {visible.length}</span>
            {visible.length > shown && <Button variant="secondary" size="sm" onClick={() => setShown(n => n + ISSUE_PAGE_SIZE)}>Show more</Button>}
          </div>
        </>
      )}
    </div>
  )
}

export const StatusLabel = ({ status }: { status: Issue['status'] }) => (
  <span className={`inline-flex items-center gap-1 text-[13px] ${status === 'resolved' ? 'text-accent-400' : status === 'ignored' ? 'text-slate-500' : 'text-slate-300'}`}>
    {status === 'resolved' && <Icon icon={Check} size="xs" />}
    {status === 'ignored' && <Icon icon={EyeOff} size="xs" />}
    <span className="capitalize">{status}</span>
  </span>
)
