import { useEffect, useState } from 'react'
import { api } from '../utils/api.utils'
import { timeAgo } from '../utils/date.utils'
import { EventBars } from './EventBars'
import type { BarRow } from './EventBars'

interface GroupLike {
  status: string
  first_seen?: string
  last_seen: string
}

interface OverviewStatusProps {
  slug: string
  groups: GroupLike[]
  now?: number
}

const DAY = 24 * 60 * 60 * 1000

/** One sentence that answers "is anything on fire?", with the last 24 hours drawn from real counts. */
export const OverviewStatus = ({ slug, groups, now = Date.now() }: OverviewStatusProps) => {
  const [rows, setRows] = useState<BarRow[] | null>(null)

  useEffect(() => {
    let live = true
    setRows(null)
    api(`/api/dashboard/series/?project=${encodeURIComponent(slug)}&backend=ch&interval=1h&range=24h`)
      .then((data: any) => {
        if (!live) return
        const list = Array.isArray(data) ? data : []
        setRows(list.map((s: any) => ({ bucket: s.bucket, error: s.error ?? 0, other: (s.warning ?? 0) + (s.info ?? 0) })))
      })
      .catch(() => { if (live) setRows([]) })
    return () => { live = false }
  }, [slug])

  const open = groups.filter(g => g.status === 'unresolved')
  const fresh = open.filter(g => g.first_seen && now - new Date(g.first_seen).getTime() < DAY)
  const last = groups.reduce<string | null>((a, g) => (!a || g.last_seen > a ? g.last_seen : a), null)
  const total = (rows ?? []).reduce((sum, r) => sum + r.error + r.other, 0)

  let headline: string
  let detail: string
  if (groups.length === 0) {
    headline = 'No events yet'
    detail = 'Nothing has been reported for this project. Connect an app to start.'
  } else if (open.length === 0) {
    headline = 'All clear'
    detail = `No open issues. Last event ${last ? timeAgo(last, now) : 'unknown'}.`
  } else {
    headline = `${open.length} open ${open.length === 1 ? 'issue' : 'issues'}`
    detail = `${fresh.length ? `${fresh.length} first seen in the last 24 hours. ` : 'None are new in the last 24 hours. '}Last event ${last ? timeAgo(last, now) : 'unknown'}.`
  }

  return (
    <section data-testid="overview-status" className="grid gap-6 rounded-lg border border-slate-800 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
      <div>
        <h2 className={`text-2xl font-semibold ${open.length > 0 ? 'text-slate-100' : 'text-accent-400'}`} data-testid="overview-headline">{headline}</h2>
        <p className="mt-1 text-sm text-slate-300">{detail}</p>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-slate-300">Events per hour, last 24 hours</span>
          <span className="tabular-nums text-slate-400">{rows === null ? '' : `${total.toLocaleString()} total`}</span>
        </div>
        {rows === null ? (
          <div className="h-16 animate-pulse rounded bg-slate-800/50" aria-busy="true" />
        ) : rows.length === 0 ? (
          <p className="h-16 text-sm text-slate-400">No event counts available for this range.</p>
        ) : (
          <EventBars rows={rows} startLabel="24 hours ago" endLabel="now" unit="events per hour" />
        )}
      </div>
    </section>
  )
}
