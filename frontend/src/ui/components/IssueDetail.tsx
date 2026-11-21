import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Bookmark, Check, CircleAlert, Copy } from 'lucide-react'
import { api } from '../utils/api.utils'
import { fmtDate, timeAgo } from '../utils/date.utils'
import type { Issue, IssueComment, IssueEvent } from '../types/issue.types'
import { useAuth } from '../auth/AuthContext'
import { LevelBadge } from './LevelBadge'
import { StatusLabel } from './IssuesPage'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'
import { Icon } from './ui/Icon'
import { useToast } from './ui/Toast'

const control = 'rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'

/** Tags arrive as a dict, a list of strings or a list of {key, value}; show them all as "key: value". */
export const tagPairs = (tags: IssueEvent['tags']): Array<[string, string]> => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.map(t => typeof t === 'string' ? (t.includes(':') ? [t.split(':')[0], t.split(':').slice(1).join(':')] : ['tag', t]) : [t.key ?? 'tag', t.value]) as Array<[string, string]>
  return Object.entries(tags).map(([k, v]) => [k, String(v)])
}

const details = (event: IssueEvent): Array<[string, string]> => {
  const p = event.payload ?? {}
  const rows: Array<[string, string | undefined]> = [
    ['Environment', event.environment],
    ['Release', typeof p.release === 'string' ? p.release : undefined],
    ['User', p.user?.email ?? p.user?.username ?? p.user?.id],
    ['Request', p.request?.url],
    ['Server', p.server_name],
    ['SDK', p.sdk?.name ? `${p.sdk.name} ${p.sdk.version ?? ''}`.trim() : undefined],
  ]
  return rows.filter((r): r is [string, string] => Boolean(r[1]))
}

interface IssueDetailProps {
  issueId: number
  onBack: () => void
}

export const IssueDetail = ({ issueId, onBack }: IssueDetailProps) => {
  const { user } = useAuth()
  const toast = useToast()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [events, setEvents] = useState<IssueEvent[]>([])
  const [comments, setComments] = useState<IssueComment[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [assignee, setAssignee] = useState('')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [g, ev, cm] = await Promise.all([
        api(`/api/groups/${issueId}/`),
        api(`/api/events/?group=${issueId}&limit=25`),
        api(`/api/groups/${issueId}/comments/`),
      ])
      setIssue(g); setAssignee(g.assignee ?? '')
      const list: IssueEvent[] = Array.isArray(ev) ? ev : ev?.results ?? []
      setEvents(list); setSelectedId(list[0]?.id ?? null)
      setComments(Array.isArray(cm) ? cm : cm?.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this issue')
    }
  }, [issueId])

  useEffect(() => { setIssue(null); load() }, [load])

  const act = async (name: string, path: string, body?: unknown) => {
    setBusy(name)
    try {
      const updated = await api(`/api/groups/${issueId}/${path}/`, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) })
      setIssue(updated); setAssignee(updated.assignee ?? '')
    } catch (e) {
      toast.addToast('error', e instanceof Error ? e.message : 'That did not work')
    } finally {
      setBusy(null)
    }
  }

  const saveAssignee = () => { if (issue && assignee.trim() !== issue.assignee) act('assign', 'assign', { assignee: assignee.trim() }) }

  const addComment = async (e: FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setBusy('comment')
    try {
      const created = await api(`/api/groups/${issueId}/comments/`, { method: 'POST', body: JSON.stringify({ body, author: user?.email ?? 'system' }) })
      setComments(c => [created, ...c]); setDraft('')
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Could not add the comment')
    } finally {
      setBusy(null)
    }
  }

  const selected = events.find(e => e.id === selectedId) ?? events[0]

  const copyStack = async () => {
    if (!selected?.stack) return
    try { await navigator.clipboard.writeText(selected.stack); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { toast.addToast('error', 'Copy failed') }
  }

  const back = (
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500" data-testid="issue-back">
      <Icon icon={ArrowLeft} size="sm" /> Issues
    </button>
  )

  if (error) return <div className="space-y-4">{back}<EmptyState icon={CircleAlert} title="Could not load this issue" description={error} action={<Button variant="secondary" size="sm" onClick={load}>Try again</Button>} testId="issue-error" /></div>
  if (!issue) return <div className="space-y-4" aria-busy="true" data-testid="issue-loading">{back}<div className="h-24 animate-pulse rounded-md bg-slate-800/50" /></div>

  const lines = (selected?.stack ?? '').split('\n')

  return (
    <div className="space-y-6" data-testid="issue-detail">
      {back}

      <header className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="mt-2"><LevelBadge level={issue.level} variant="compact" /></span>
          <h1 className="min-w-0 break-words text-xl font-semibold text-slate-100" data-testid="issue-title">{issue.title}</h1>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-400">
          <StatusLabel status={issue.status} />
          <span className="tabular-nums">{issue.count.toLocaleString()} events</span>
          <span title={fmtDate(issue.first_seen)}>First seen {timeAgo(issue.first_seen)}</span>
          <span title={fmtDate(issue.last_seen)}>Last seen {timeAgo(issue.last_seen)}</span>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Issue actions">
        {issue.status === 'resolved'
          ? <Button size="sm" variant="secondary" loading={busy === 'unresolve'} onClick={() => act('unresolve', 'unresolve')} testId="issue-unresolve">Reopen</Button>
          : <Button size="sm" variant="primary" loading={busy === 'resolve'} onClick={() => act('resolve', 'resolve')} testId="issue-resolve">Resolve</Button>}
        {issue.status !== 'ignored' && <Button size="sm" variant="secondary" loading={busy === 'ignore'} onClick={() => act('ignore', 'ignore')} testId="issue-ignore">Ignore</Button>}
        <Button size="sm" variant="ghost" aria-pressed={issue.is_bookmarked} aria-label={issue.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
          icon={<Icon icon={Bookmark} size="sm" className={issue.is_bookmarked ? 'fill-current' : ''} />}
          onClick={() => act('bookmark', issue.is_bookmarked ? 'unbookmark' : 'bookmark')} testId="issue-bookmark">{issue.is_bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-400">
          Assignee
          <input value={assignee} onChange={e => setAssignee(e.target.value)} onBlur={saveAssignee} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            placeholder="Unassigned" className={`${control} h-8 w-48`} data-testid="issue-assignee" />
        </label>
      </div>

      {selected ? (
        <section aria-label="Event" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-100">Latest event</h2>
            <span className="text-[13px] text-slate-500" title={fmtDate(selected.received_at)}>{timeAgo(selected.received_at)}</span>
          </div>
          {selected.stack?.split('\n')[0]?.trim() !== selected.message.trim() && <p className="break-words text-sm text-slate-200" data-testid="issue-event-message">{selected.message}</p>}

          {selected.stack ? (
            <div className="relative rounded-lg border border-slate-800 bg-slate-900/60">
              <button type="button" onClick={copyStack} aria-label="Copy stack trace" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
                <Icon icon={copied ? Check : Copy} size="sm" />
              </button>
              <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-5" data-testid="issue-stack">
                {lines.map((line, i) => <div key={i} className={i === 0 ? 'font-semibold text-slate-100' : 'text-slate-400'}>{line || ' '}</div>)}
              </pre>
            </div>
          ) : <p className="text-sm text-slate-500">This event has no stack trace.</p>}

          {(details(selected).length > 0 || tagPairs(selected.tags).length > 0) && (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2" data-testid="issue-details">
              {details(selected).map(([k, v]) => (
                <div key={k} className="flex gap-3"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 break-words text-slate-200">{v}</dd></div>
              ))}
              {tagPairs(selected.tags).map(([k, v]) => (
                <div key={`tag-${k}-${v}`} className="flex gap-3"><dt className="w-24 shrink-0 truncate text-slate-500">{k}</dt><dd className="min-w-0 break-words font-mono text-[13px] text-slate-200">{v}</dd></div>
              ))}
            </dl>
          )}
        </section>
      ) : <p className="text-sm text-slate-500">No events are stored for this issue.</p>}

      {events.length > 1 && (
        <section aria-label="Recent events" className="space-y-2">
          <h2 className="text-base font-semibold text-slate-100">Recent events</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800"><th className="py-2.5 pl-4">When</th><th className="py-2.5 pl-6">Environment</th><th className="w-full py-2.5 pl-6 pr-4">Message</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {events.map(ev => (
                  <tr key={ev.id} data-testid={`issue-event-${ev.id}`} onClick={() => setSelectedId(ev.id)} aria-selected={ev.id === selected?.id}
                    className={`cursor-pointer hover:bg-slate-800/40 ${ev.id === selected?.id ? 'bg-slate-800/60' : ''}`}>
                    <td className="whitespace-nowrap py-2 pl-4 text-slate-300">{fmtDate(ev.received_at)}</td>
                    <td className="whitespace-nowrap py-2 pl-6 text-slate-400">{ev.environment ?? ''}</td>
                    <td className="w-full max-w-0 truncate py-2 pl-6 pr-4 text-slate-300">{ev.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-label="Comments" className="space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Comments</h2>
        <form onSubmit={addComment} className="space-y-2">
          <label className="sr-only" htmlFor="issue-comment">Add a comment</label>
          <textarea id="issue-comment" value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Add a comment" className={`${control} w-full py-2`} data-testid="issue-comment-input" />
          <Button type="submit" size="sm" variant="secondary" loading={busy === 'comment'} disabled={!draft.trim()} testId="issue-comment-submit">Comment</Button>
        </form>
        {comments.length === 0 ? <p className="text-sm text-slate-500">No comments yet.</p> : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800" data-testid="issue-comments">
            {comments.map(c => (
              <li key={c.id} className="space-y-1 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-[13px]"><span className="font-medium text-slate-200">{c.author}</span><span className="text-slate-500" title={fmtDate(c.created_at)}>{timeAgo(c.created_at)}</span></div>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
