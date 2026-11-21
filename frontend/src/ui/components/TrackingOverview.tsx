import { SecretValue } from './SecretValue'
import { maskSecret } from '../utils/secret'
import { useEffect, useState } from 'react'
import { api } from '../utils/api.utils'

interface TrackingItem {
  id: number
  source: string
  kind: string
  detail: string
  location: string
  status: 'active' | 'planned' | 'removed'
  origin: string
  updated_at: string
}

interface Overview {
  project: { id: number; name: string; slug: string; description: string; ingest_token: string; created_at: string }
  stats: { events_total: number; groups_total: number; groups_unresolved: number; first_event_at: string | null; last_event_at: string | null }
  sources: { sampled_events: number; environments: string[]; levels: Record<string, number>; platforms: string[]; tag_keys: string[] }
  tracking: TrackingItem[]
  releases: string[]
  alert_rules: Array<{ name: string; active: boolean; target_type: string }>
  integrations: string[]
  external_links_total: number
  ingest_endpoint: string
}

const SOURCES = ['frontend', 'backend', 'mobile', 'infra', 'job', 'test', 'other'] as const
const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  planned: 'bg-amber-500/20 text-amber-300',
  removed: 'bg-slate-600/30 text-slate-400 line-through',
}
const SOURCE_STYLE: Record<string, string> = {
  frontend: 'bg-sky-500/20 text-sky-300',
  backend: 'bg-slate-800/60 text-slate-300',
  mobile: 'bg-slate-800 text-slate-300',
  infra: 'bg-slate-800/60 text-slate-100',
  job: 'bg-slate-800 text-slate-300',
  test: 'bg-slate-500/20 text-slate-300',
  other: 'bg-slate-500/20 text-slate-300',
}

const chip = 'rounded-full bg-slate-800/70 px-2.5 py-1 text-xs text-slate-200'
function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <span className="text-xs text-slate-400">{empty}</span>
  return <div className="flex flex-wrap gap-1.5">{items.map(i => <span key={i} className={chip}>{i}</span>)}</div>
}

const blank = { source: 'frontend', kind: '', detail: '', location: '', status: 'active' as const }

export function TrackingOverview({ slug }: { slug: string }) {
  const [data, setData] = useState<Overview | null>(null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{ source: string; kind: string; detail: string; location: string; status: string }>(blank)

  const base = `/api/projects/${encodeURIComponent(slug)}`
  const load = () => api(`${base}/overview/`).then(setData).catch(() => setData(null))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug])

  const saveDesc = async () => {
    const u = await api(`${base}/overview/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: draft }) })
    setData(u); setEditingDesc(false)
  }
  const addItem = async () => {
    if (!form.kind.trim()) return
    await api(`${base}/tracking/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, origin: 'human' }) })
    setForm(blank); setAdding(false); load()
  }
  const setStatus = async (id: number, status: string) => {
    await api(`${base}/tracking/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    load()
  }
  const remove = async (id: number) => {
    if (!window.confirm('Remove this monitor from the inventory?')) return
    await api(`${base}/tracking/${id}/`, { method: 'DELETE' }); load()
  }

  if (!data) return null
  const st = (data.stats ?? {}) as Partial<Overview['stats']>
  const s = { events_total: st.events_total ?? 0, groups_total: st.groups_total ?? 0, groups_unresolved: st.groups_unresolved ?? 0, first_event_at: st.first_event_at ?? null, last_event_at: st.last_event_at ?? null }
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—')
  const declared = data.tracking.filter(t => t.status !== 'removed')
  const facts: Array<{ label: string; noun: string; items: string[]; href?: string }> = [
    { label: 'Environments', noun: 'environments', items: data.sources.environments },
    { label: 'Platforms and SDKs', noun: 'platforms and SDKs', items: data.sources.platforms },
    { label: 'Tag keys', noun: 'tag keys', items: data.sources.tag_keys },
    { label: 'Recent releases', noun: 'releases', items: data.releases, href: '#view=releases' },
    { label: 'Integrations', noun: 'integrations', items: data.integrations, href: '#view=integrations' },
    { label: 'Alert rules', noun: 'alert rules', items: data.alert_rules.map(r => `${r.name}${r.active ? '' : ' (off)'}`), href: '#view=alerts' },
  ]

  return (
    <section data-testid="tracking-overview" className="space-y-6 rounded-lg border border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">What we're monitoring</h2>
          <p className="text-sm text-slate-300">Monitors declared for this project, and what has actually arrived.</p>
        </div>
        {!editingDesc && (
          <button onClick={() => { setDraft(data.project.description || ''); setEditingDesc(true) }} className="min-h-8 items-center inline-flex text-sm text-slate-200 underline underline-offset-2 hover:text-white">
            {data.project.description ? 'Edit summary' : 'Add summary'}
          </button>
        )}
      </div>

      {/* Human/agent summary */}
      {editingDesc ? (
        <div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
            placeholder="One-line summary of what this project monitors and why."
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" />
          <div className="mt-2 flex gap-2">
            <button onClick={saveDesc} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">Save</button>
            <button onClick={() => setEditingDesc(false)} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Cancel</button>
          </div>
        </div>
      ) : data.project.description ? (
        <p className="text-sm text-slate-300">{data.project.description}</p>
      ) : null}

      {/* DECLARED monitors — the inventory */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-200">Declared monitors <span className="text-slate-400">({declared.length})</span></h4>
          <button onClick={() => setAdding(a => !a)} className="min-h-8 items-center inline-flex text-sm text-slate-200 underline underline-offset-2 hover:text-white" data-testid="add-monitor">
            {adding ? 'Close' : '+ Add monitor'}
          </button>
        </div>

        {adding && (
          <div className="mb-3 grid gap-2 rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 sm:grid-cols-2">
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100">
              {SOURCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} placeholder="kind — e.g. window.onerror" className="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100" />
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="location — file or endpoint" className="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100" />
            <input value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="detail — what it captures" className="h-8 rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100" />
            <div className="sm:col-span-2">
              <button onClick={addItem} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">Add</button>
            </div>
          </div>
        )}

        {declared.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700/60 p-4 text-sm text-slate-400">
            No monitors declared yet. Ask the AI agent: <em>“list what you're tracking in this project”</em> or <em>“add tracking for the backend 5xx handler.”</em>
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/60 overflow-hidden rounded-lg border border-slate-800/60">
            {declared.map(t => (
              <li key={t.id} className="flex items-start justify-between gap-3 bg-slate-900/30 p-3" data-testid={`monitor-${t.id}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${SOURCE_STYLE[t.source] || SOURCE_STYLE.other}`}>{t.source}</span>
                    <span className="text-sm font-medium text-slate-100">{t.kind}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                    <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-xs text-slate-400" title="who declared it">{t.origin}</span>
                  </div>
                  {t.detail && <div className="mt-1 text-xs text-slate-400">{t.detail}</div>}
                  {t.location && <div className="mt-0.5 font-mono text-xs text-slate-400">{t.location}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {t.status !== 'active' && <button onClick={() => setStatus(t.id, 'active')} className="inline-flex min-h-8 items-center text-slate-200 underline underline-offset-2 hover:text-white">Activate</button>}
                  {t.status === 'active' && <button onClick={() => setStatus(t.id, 'removed')} className="inline-flex min-h-8 items-center text-amber-400 hover:text-amber-300">Retire</button>}
                  <button onClick={() => remove(t.id)} className="inline-flex min-h-8 items-center text-red-400 hover:text-red-300">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* OBSERVED: only what has values; everything empty is one line below */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Actually arriving</h3>
        <p className="mb-3 text-sm text-slate-300" data-testid="arriving-summary">
          {s.events_total.toLocaleString()} stored {s.events_total === 1 ? 'event' : 'events'} in {s.groups_total} {s.groups_total === 1 ? 'issue' : 'issues'} ({s.groups_unresolved} unresolved)
          {(data.sources.sampled_events ?? 0) > 0 && data.sources.sampled_events < s.events_total ? `. The lists below come from the latest ${data.sources.sampled_events}.` : '.'}
          {data.external_links_total > 0 ? ` ${data.external_links_total} linked ${data.external_links_total === 1 ? 'ticket' : 'tickets'}.` : ''}
        </p>
        {facts.some(f => f.items.length > 0) && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {facts.filter(f => f.items.length > 0).map(f => (
              <div key={f.label}><dt className="mb-1.5 text-xs text-slate-400">{f.label}</dt><dd><Chips items={f.items} empty="" /></dd></div>
            ))}
          </dl>
        )}
        {facts.some(f => f.items.length === 0) && (
          <p className="mt-3 text-sm text-slate-400" data-testid="not-set-up">
            Not set up yet: {facts.filter(f => f.items.length === 0).map((f, i, arr) => (
              <span key={f.label}>{f.href ? <a href={`${f.href}&project=${encodeURIComponent(slug)}`} className="text-slate-200 underline underline-offset-2 hover:text-white">{f.noun}</a> : f.noun}{i < arr.length - 1 ? ', ' : '.'}</span>
            ))}
          </p>
        )}
      </div>

      <div className="border-t border-slate-800/60 pt-4 text-xs text-slate-400">
        <div>First event: <span className="text-slate-200">{fmt(s.first_event_at)}</span> · Last event: <span className="text-slate-200">{fmt(s.last_event_at)}</span></div>
        <div className="mt-1">
          Ingest endpoint: <SecretValue value={data.project.ingest_token} label="ingest token"
            display={revealed => `/api/events/ingest/token/${revealed ? data.project.ingest_token : maskSecret(data.project.ingest_token)}/`} />
        </div>
      </div>
    </section>
  )
}
