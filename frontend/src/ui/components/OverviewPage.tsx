import { useEffect, useState } from 'react'
import { LevelBadge } from './LevelBadge'
import { Button } from './ui/Button'
import { OverviewStatus } from './OverviewStatus'
import { issueHref } from './IssuesPage'
import { timeAgo } from '../utils/date.utils'
import { TrackingOverview } from './TrackingOverview'
import { AlertRuleForm } from './forms/AlertRuleForm'
import { DeploymentForm } from './forms/DeploymentForm'
import { ReleaseForm } from './forms/ReleaseForm'
import { ArtifactForm } from './forms/ArtifactForm'
import { AddTargetForm } from './forms/AddTargetForm'
import { api } from '../utils/api.utils'

// Import types
import type { 
  Project, 
  Release, 
  Deployment, 
  AlertRule, 
  Group,
  TimeRange,
  TimeInterval 
} from '../types/app.types'

// All form components now imported from forms/ directory
// - ReleaseForm now imported from forms/ReleaseForm
// - DeploymentForm now imported from forms/DeploymentForm  
// - ArtifactForm now imported from forms/ArtifactForm
// - AddTargetForm now imported from forms/AddTargetForm

interface OverviewPageProps {
  selected: Project
  releases: Release[]
  createRelease: (version: string, env: string) => void
  deploys: Deployment[]
  createDeployment: (name: string, url: string, env: string, releaseId?: number) => void
  sessionUser: string
  setSessionUser: (user: string) => void
  sendSession: (status: 'init'|'ok'|'errored'|'crashed'|'exited') => void
  range: TimeRange
  setRange: (r: TimeRange) => void
  interval: TimeInterval
  setInterval: (i: TimeInterval) => void
  refreshSeries: () => void
  series: any[]
  health: any[]
  rules: AlertRule[]
  createRule: (name: string, level: string, threshold: number, targetType: 'email'|'webhook', targetValue: string) => void
  editRule: {threshold: number; window: number; notify: number}
  setEditRule: (rule: {threshold: number; window: number; notify: number}) => void
  updateFirstRule: () => void
  groups: Group[]
  setGroups: (groups: Group[]) => void
  snoozeGroup: (groupId: number, minutes?: number) => void
}

export function OverviewPage({
  selected,
  releases,
  createRelease,
  deploys,
  createDeployment,
  sessionUser,
  setSessionUser,
  sendSession,
  range,
  setRange,
  interval,
  setInterval,
  refreshSeries,
  series,
  health,
  rules,
  createRule,
  editRule,
  setEditRule,
  updateFirstRule,
  groups,
  setGroups,
  snoozeGroup,
}: OverviewPageProps) {
  const [selectedRelease, setSelectedRelease] = useState<number | null>(null)

  // Issue-tracker integrations (configure under the Integrations tab).
  const [providers, setProviders] = useState<string[]>([])
  const [issueModal, setIssueModal] = useState<{
    group: Group
    links: Array<{id: number; provider: string; url: string; external_key: string}>
    busy: string | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    api('/api/integrations/')
      .then((d: any) => setProviders((d.integrations || []).map((i: any) => i.provider)))
      .catch(() => setProviders([]))
  }, [])

  const openIssueModal = async (group: Group) => {
    setIssueModal({ group, links: [], busy: null, error: null })
    const links = await api(`/api/groups/${group.id}/links/`).catch(() => [])
    setIssueModal(m => (m && m.group.id === group.id ? { ...m, links } : m))
  }

  const createIssue = async (provider: string) => {
    setIssueModal(m => (m ? { ...m, busy: provider, error: null } : m))
    try {
      const group = issueModal!.group
      await api(`/api/groups/${group.id}/create-issue/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const links = await api(`/api/groups/${group.id}/links/`).catch(() => [])
      setIssueModal(m => (m ? { ...m, links, busy: null } : m))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create issue'
      setIssueModal(m => (m ? { ...m, busy: null, error: msg } : m))
    }
  }

  const attention = groups
    .filter(g => g.status === 'unresolved')
    .map(g => ({ group: g, isNew: !!g.first_seen && Date.now() - new Date(g.first_seen).getTime() < 24 * 60 * 60 * 1000 }))
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || (a.group.last_seen < b.group.last_seen ? 1 : -1))

  const PROVIDER_LABEL: Record<string, string> = { github: 'GitHub issue', ossicone: 'Ossicone ticket' }

  return (
    <div data-testid="overview-page" className="space-y-6">
      <header data-testid="overview-header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100" data-testid="project-title">{selected.name}</h1>
          <p className="text-sm text-slate-400" data-testid="project-description">
            Open issues, releases and alert rules for this project.
          </p>
        </div>
        <div className="text-right" data-testid="project-info">
          <div className="text-xs text-slate-400">Project slug</div>
          <div className="font-mono text-sm text-slate-300">{selected.slug}</div>
        </div>
      </header>

      <OverviewStatus slug={selected.slug} groups={groups} />

      <section data-testid="groups-section" className="rounded-lg border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-100">Needs attention</h2>
          <a href={`#view=issues&project=${encodeURIComponent(selected.slug)}`} className="inline-flex min-h-8 items-center text-sm text-accent-400 hover:text-accent-300">View all issues</a>
        </div>
        {attention.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-300" data-testid="groups-table">No open issues.</p>
        ) : (
          <div className="overflow-x-auto" data-testid="groups-table">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr><th className="pl-4">Issue</th><th className="pl-3 text-right">Events</th><th className="pl-6">Last seen</th><th className="pr-4 text-right"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {attention.slice(0, 8).map(({ group: g, isNew }) => (
                  <tr key={g.id} className="border-t border-slate-800" data-testid={`group-${g.id}`}>
                    <td className="w-full max-w-0 py-1 pl-4">
                      <div className="flex items-center gap-2">
                        <LevelBadge level={g.level} variant="compact" />
                        <a href={issueHref(selected.slug, g.id)} className="block min-h-9 flex-1 truncate py-2 text-slate-100 hover:underline">{g.title}</a>
                        {isNew && <span className="shrink-0 rounded bg-accent-900 px-1.5 py-0.5 text-xs text-accent-300">New</span>}
                      </div>
                    </td>
                    <td className="pl-3 text-right tabular-nums text-slate-200">{g.count.toLocaleString()}</td>
                    <td className="whitespace-nowrap pl-6 text-slate-300">{timeAgo(g.last_seen)}</td>
                    <td className="space-x-1 whitespace-nowrap pr-4 text-right">
                      {rules.length > 0 ? (
                        <Button size="xs" variant="secondary" data-testid={`snooze-group-${g.id}`} onClick={() => snoozeGroup(g.id, 60)}>Snooze</Button>
                      ) : null}
                      {providers.length > 0 ? (
                        <Button size="xs" variant="secondary" data-testid={`issue-group-${g.id}`} onClick={() => openIssueModal(g)}>Create ticket</Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TrackingOverview slug={selected.slug} />

      <details className="group rounded-lg border border-slate-800" data-testid="setup-section">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm text-slate-200 hover:bg-slate-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
          <span className="font-medium">Releases, deployments and alert rules</span>
          <span className="text-slate-400">
            <span data-testid="releases-count">{releases.length}</span> releases · <span data-testid="deployments-count">{deploys.length}</span> deployments · <span data-testid="alert-rules-count">{rules.length}</span> alert rules
          </span>
        </summary>
        <div className="border-t border-slate-800 p-4">
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Release Management */}
        <section data-testid="releases-section" className="rounded-lg border border-slate-800/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Releases</h2>
            <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-medium text-accent-400">
              {releases.length}
            </span>
          </div>

          {/* Create Release Form - single row */}
          <div className="mb-4" data-testid="release-form">
            <ReleaseForm onCreate={createRelease} />
          </div>

          {/* Releases List */}
          {releases.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No releases yet</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto" data-testid="releases-table">
              {releases.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                  data-testid={`release-${r.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{r.version}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.environment === 'production'
                        ? 'bg-accent-500/20 text-accent-400'
                        : r.environment === 'staging'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-500/20 text-slate-300'
                    }`}>
                      {r.environment}
                    </span>
                    <span className="text-xs text-slate-400">{r.created_at}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRelease(selectedRelease === r.id ? null : r.id)}
                    className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-300 hover:bg-slate-700"
                  >
                    {selectedRelease === r.id ? 'Hide' : 'Artifacts'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Artifact Upload */}
          {selectedRelease && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <ArtifactForm releaseId={selectedRelease} onUpload={() => setSelectedRelease(null)} />
            </div>
          )}
        </section>

        {/* Deployment Management */}
        <section data-testid="deployments-section" className="rounded-lg border border-slate-800/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Deployments</h2>
            <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-medium text-accent-400">
              {deploys.length}
            </span>
          </div>

          {/* Create Deployment Form - single row */}
          <div className="mb-4" data-testid="deployment-form">
            <DeploymentForm onCreate={createDeployment} />
          </div>

          {/* Deployments List */}
          {deploys.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No deployments yet</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto" data-testid="deployments-table">
              {deploys.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                  data-testid={`deployment-${d.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white">{d.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      d.environment === 'production'
                        ? 'bg-accent-500/20 text-accent-400'
                        : d.environment === 'staging'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-500/20 text-slate-300'
                    }`}>
                      {d.environment}
                    </span>
                    <span className="text-xs text-slate-400">{d.date_started}</span>
                  </div>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-400 hover:text-accent-400 truncate max-w-[120px]"
                      title={d.url}
                    >
                      {d.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Release Health */}
        <section data-testid="release-health-section" className="rounded-lg border border-slate-800/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Release health</h2>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            Crash-free sessions per release. Send test sessions to check the numbers.
          </p>
          
          {/* Session Testing */}
          <div className="mb-4 rounded border border-slate-700/50 bg-slate-800/30 p-3" data-testid="session-testing">
            <div className="mb-2 text-xs font-medium text-slate-300">Test Session Data</div>
            <div className="flex flex-wrap items-center gap-2">
              <input 
                data-testid="session-user-input"
                value={sessionUser} 
                onChange={e => setSessionUser(e.target.value)} 
                placeholder="user id" 
                className="rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
              />
              <button 
                data-testid="send-ok-session"
                className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800/60" 
                onClick={() => sendSession('ok')}
              >
                Send ok session
              </button>
              <button 
                data-testid="send-crashed-session"
                className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800/60" 
                onClick={() => sendSession('crashed')}
              >
                Send crashed session
              </button>
            </div>
          </div>

          {/* Health Data Controls */}
          <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="health-controls">
            <label className="text-xs text-slate-400">Range</label>
            <select 
              data-testid="health-range-select"
              className="rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
              value={range} 
              onChange={e => setRange(e.target.value as any)}
            >
              <option value="1h">1h</option>
              <option value="24h">24h</option>
            </select>
            <label className="text-xs text-slate-400">Interval</label>
            <select 
              data-testid="health-interval-select"
              className="rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
              value={interval} 
              onChange={e => setInterval(e.target.value as any)}
            >
              <option value="5m">5m</option>
              <option value="1h">1h</option>
            </select>
            <button 
              data-testid="refresh-health"
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800/60" 
              onClick={refreshSeries}
            >
              Refresh
            </button>
          </div>

          {/* Health Tables */}
          <div className="space-y-4">
            {series.length > 0 && (
              <div data-testid="health-series-table">
                <div className="text-xs font-medium text-slate-300 mb-2">Time Series Data</div>
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-slate-400">
                      <tr><th>Bucket</th><th>Total</th><th>Crashed</th><th>Crash-free %</th></tr>
                    </thead>
                    <tbody>
                      {series.map((b, idx) => (
                        <tr key={idx} className="border-t border-slate-800/60">
                          <td className="py-1">{b.bucket}</td>
                          <td>{b.total}</td>
                          <td>{b.crashed}</td>
                          <td>{b.total === 0 ? 100 : Math.round(100 * (b.total - b.crashed) / b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {health.length > 0 && (
              <div data-testid="health-summary-table">
                <div className="text-xs font-medium text-slate-300 mb-2">Release Health Summary</div>
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-slate-400">
                      <tr><th>Version</th><th>Env</th><th>Total</th><th>Crashed</th><th>Crash-free %</th></tr>
                    </thead>
                    <tbody>
                      {health.map((h, idx) => (
                        <tr key={idx} className="border-t border-slate-800/60">
                          <td className="py-1">{h.version}</td>
                          <td>{h.environment}</td>
                          <td>{h.total_sessions}</td>
                          <td>{h.crashed_sessions}</td>
                          <td>{h.crash_free_rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Alert Rules */}
        <section data-testid="alert-rules-section" className="rounded-lg border border-slate-800/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Alert rules</h2>
            <span className="rounded-full bg-slate-800/60 px-2 py-1 text-xs text-slate-100">
              {rules.length} rules
            </span>
          </div>
          
          <div data-testid="alert-rule-form">
            <AlertRuleForm onCreate={createRule} />
          </div>
          
          {rules.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3" data-testid="alert-rule-editor">
                <div className="mb-2 text-xs font-medium text-slate-300">Edit First Rule</div>
                <div className="flex items-center gap-2">
                  <input 
                    data-testid="rule-threshold-input"
                    type="number" 
                    value={editRule.threshold} 
                    onChange={e => setEditRule({...editRule, threshold: parseInt(e.target.value)})} 
                    placeholder="threshold" 
                    className="w-20 rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
                  />
                  <input 
                    data-testid="rule-window-input"
                    type="number" 
                    value={editRule.window} 
                    onChange={e => setEditRule({...editRule, window: parseInt(e.target.value)})} 
                    placeholder="window (min)" 
                    className="w-24 rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
                  />
                  <input 
                    data-testid="rule-notify-input"
                    type="number" 
                    value={editRule.notify} 
                    onChange={e => setEditRule({...editRule, notify: parseInt(e.target.value)})} 
                    placeholder="notify (min)" 
                    className="w-24 rounded border border-slate-700 bg-transparent px-2 py-1 text-xs" 
                  />
                  <button 
                    data-testid="update-rule-button"
                    className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800/60" 
                    onClick={updateFirstRule}
                  >
                    Update
                  </button>
                </div>
              </div>
              
              <div data-testid="alert-targets-form">
                <AddTargetForm ruleId={rules[0].id} onAdded={() => { /* target persisted server-side; rules refresh on next parent load */ }} />
              </div>
            </div>
          )}
          
          <div className="mt-4 max-h-40 overflow-y-auto" data-testid="alert-rules-table">
            <table className="w-full text-xs">
              <thead className="text-left text-slate-400">
                <tr><th>Name</th><th>Level</th><th>Threshold</th><th>Target</th></tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-t border-slate-800/60" data-testid={`alert-rule-${r.id}`}>
                    <td className="py-1">{r.name}</td>
                    <td>{r.level || 'any'}</td>
                    <td>{r.threshold_count}</td>
                    <td className="truncate max-w-32">{r.target_type}: {r.target_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
        </div>
      </details>

      {/* Create Issue Modal */}
      {issueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="issue-modal">
          <div className="w-[28rem] rounded-lg border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-1 text-base font-semibold text-slate-100">Create Issue</h3>
            <p className="mb-4 truncate text-xs text-slate-400" title={issueModal.group.title}>
              from “{issueModal.group.title}”
            </p>

            {issueModal.links.length > 0 && (
              <div className="mb-4 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Linked issues</div>
                <ul className="space-y-1 text-sm">
                  {issueModal.links.map(l => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">
                        {PROVIDER_LABEL[l.provider] || l.provider} {l.external_key}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">Open a new issue in</div>
              {providers.map(p => (
                <button
                  key={p}
                  data-testid={`create-issue-${p}`}
                  disabled={issueModal.busy !== null}
                  onClick={() => createIssue(p)}
                  className="flex w-full items-center justify-between rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                >
                  <span>{PROVIDER_LABEL[p] || p}</span>
                  <span className="text-xs text-slate-400">{issueModal.busy === p ? 'Creating…' : '→'}</span>
                </button>
              ))}
            </div>

            {issueModal.error && <p className="mt-3 text-sm text-red-400" data-testid="issue-error">{issueModal.error}</p>}

            <div className="mt-5 flex justify-end">
              <button
                className="rounded border border-slate-600 px-3 py-1 text-sm hover:bg-slate-700"
                onClick={() => setIssueModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}