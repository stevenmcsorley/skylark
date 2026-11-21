import { useEffect, useState } from 'react'
import { api } from '../utils/api.utils'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

export const PROVIDER_LABEL: Record<string, string> = { github: 'GitHub issue', ossicone: 'Ossicone ticket' }

interface Link { id: number; provider: string; url: string; external_key: string }

/** Hand an issue to a person or an agent: open a ticket in a connected tracker and see what is already linked. */
export const TicketDialog = ({ issue, providers, onClose }: { issue: { id: number; title: string } | null; providers: string[]; onClose: () => void }) => {
  const [links, setLinks] = useState<Link[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLinks([]); setError(null); setBusy(null)
    if (!issue) return
    let live = true
    api(`/api/groups/${issue.id}/links/`).then((l: unknown) => { if (live) setLinks(Array.isArray(l) ? l as Link[] : []) }).catch(() => {})
    return () => { live = false }
  }, [issue])

  const create = async (provider: string) => {
    if (!issue) return
    setBusy(provider); setError(null)
    try {
      await api(`/api/groups/${issue.id}/create-issue/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) })
      setLinks(await api(`/api/groups/${issue.id}/links/`).catch(() => []))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the ticket')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal isOpen={issue !== null} onClose={onClose} title="Hand this to an agent or a person" testId="issue-modal"
      footer={<Button variant="secondary" size="md" onClick={onClose}>Close</Button>}>
      <p className="mb-1 truncate text-sm font-medium text-slate-100" title={issue?.title}>{issue?.title}</p>
      <p className="mb-4 text-sm text-slate-400">Opens a ticket that an agent or a teammate can pick up.</p>
      {links.length > 0 && (
        <div className="mb-4 rounded-md border border-slate-700 p-3">
          <div className="mb-1 text-sm font-medium text-slate-100">Already linked</div>
          <ul className="space-y-1 text-sm">
            {links.map(l => (
              <li key={l.id}><a href={l.url} target="_blank" rel="noreferrer" className="text-slate-100 underline underline-offset-2">{PROVIDER_LABEL[l.provider] || l.provider} {l.external_key}</a></li>
            ))}
          </ul>
        </div>
      )}
      {providers.length === 0 ? (
        <p className="text-sm text-slate-300">No tracker is connected yet. Connect GitHub or Ossicone under Settings, Integrations, and tickets for agents to pick up will be created from here.</p>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-100">Open a ticket in</div>
          {providers.map(p => (
            <button key={p} type="button" data-testid={`create-issue-${p}`} disabled={busy !== null} onClick={() => create(p)}
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-slate-700 px-3 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50">
              <span>{PROVIDER_LABEL[p] || p}</span>
              <span className="text-sm text-slate-400">{busy === p ? 'Creating…' : 'Create'}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400" data-testid="issue-error">{error}</p>}
    </Modal>
  )
}
