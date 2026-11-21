import { useState } from 'react'
import type { FormEvent } from 'react'
import { LevelBadge } from './LevelBadge'
import { Button } from './ui/Button'
import { PageHeader } from './ui/PageHeader'
import { timeAgo } from '../utils/date.utils'
import type { Estate, EstateRow } from '../hooks/useEstate'

interface AppsPageProps {
  estate: Estate | null
  onOpen: (slug: string, section?: string) => void
  onCreate: (name: string) => Promise<void> | void
}

const field = 'h-9 rounded-md border border-slate-500 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-400'

/** One row per app: is it healthy, what broke last, when did it last speak. */
const status = (row: EstateRow) =>
  row.events_total === 0
    ? { text: 'Not connected', tone: 'text-slate-400', next: 'Set up', section: 'setup' }
    : row.unresolved > 0
      ? { text: `${row.unresolved} open`, tone: 'text-red-400 font-semibold', next: 'Open', section: 'health' }
      : { text: 'Clear', tone: 'text-emerald-400 font-semibold', next: 'Open', section: 'health' }

export const AppsPage = ({ estate, onOpen, onCreate }: AppsPageProps) => {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try { await onCreate(name.trim()); setName('') } finally { setCreating(false) }
  }

  const rows = [...(estate?.projects ?? [])].sort((a, b) => b.unresolved - a.unresolved || a.name.localeCompare(b.name))

  return (
    <div data-testid="apps-page">
      <PageHeader title="Apps" purpose="Everything that sends errors to Skylark."
        actions={
          <form onSubmit={create} className="flex gap-2">
            <label className="sr-only" htmlFor="new-app-name">New app name</label>
            <input id="new-app-name" value={name} onChange={e => setName(e.target.value)} placeholder="New app name" className={`${field} w-48`} autoComplete="off" data-testid="project-name-input" />
            <Button type="submit" size="md" variant="primary" disabled={!name.trim() || creating} testId="create-project-button">{creating ? 'Creating…' : 'Add app'}</Button>
          </form>
        } />

      {estate === null ? (
        <div className="h-24 animate-pulse rounded-lg bg-slate-800/60" aria-busy="true" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-slate-700 bg-slate-950 p-8 text-center text-sm text-slate-300" data-testid="no-projects">No apps yet. Add one above, then paste its snippet into your code.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
          <table className="w-full text-sm" data-testid="apps-table">
            <thead>
              <tr className="h-12 border-b border-slate-700">
                <th className="pl-4">App</th>
                <th className="pl-4">Status</th>
                <th className="hidden pl-4 md:table-cell">Latest issue</th>
                <th className="hidden pl-4 sm:table-cell">Last event</th>
                <th className="hidden pl-4 lg:table-cell">Release</th>
                <th className="pr-3 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rows.map(row => {
                const s = status(row)
                return (
                  <tr key={row.id} className="hover:bg-slate-900" data-testid={`app-row-${row.slug}`}>
                    <td className="py-2 pl-4">
                      <a href={`#view=apps&project=${encodeURIComponent(row.slug)}&tab=health`} onClick={e => { e.preventDefault(); onOpen(row.slug, 'health') }} className="inline-block py-0.5 font-medium text-slate-100 hover:underline">{row.name}</a>
                      <div className="font-mono text-xs text-slate-400">{row.slug}</div>
                    </td>
                    <td className={`pl-4 ${s.tone}`}>{s.text}</td>
                    <td className="hidden max-w-xs pl-4 md:table-cell">
                      {row.latest_issue ? <span className="flex items-center gap-2"><LevelBadge level={row.latest_issue.level} variant="compact" /><span className="truncate text-slate-300">{row.latest_issue.title}</span></span> : <span className="text-slate-400">None</span>}
                    </td>
                    <td className="hidden whitespace-nowrap pl-4 text-slate-300 sm:table-cell">{row.last_event_at ? timeAgo(row.last_event_at) : 'Never'}</td>
                    <td className="hidden whitespace-nowrap pl-4 text-slate-300 lg:table-cell">{row.last_deploy?.version ?? <span className="text-slate-400">None</span>}</td>
                    <td className="whitespace-nowrap py-1 pr-3 text-right">
                      <Button size="md" variant={s.next === 'Set up' ? 'primary' : 'secondary'} onClick={() => onOpen(row.slug, s.section)} data-testid={`app-open-${row.slug}`}>{s.next}</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
