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
  /** The apps to count. One slug for an app's Health page, every slug for the Inbox. */
  slugs: string[]
  /** Name used in the empty sentence, e.g. "this app" or "any app". */
  scope?: string
  groups: GroupLike[]
  now?: number
}

const DAY = 24 * 60 * 60 * 1000

/** One sentence that answers "is anything on fire?", with the last 24 hours drawn from real counts. */
export const OverviewStatus = ({ slugs, scope = 'this app', groups, now = Date.now() }: OverviewStatusProps) => {
  const [rows, setRows] = useState<BarRow[] | null>(null)

  const key = slugs.join('|')
  useEffect(() => {
    let live = true
    setRows(null)
    if (slugs.length === 0) { setRows([]); return }
    Promise.all(slugs.map(slug =>
      api(`/api/dashboard/series/?project=${encodeURIComponent(slug)}&backend=ch&interval=1h&range=24h`).then((d: any) => (Array.isArray(d) ? d : [])).catch(() => [])
    )).then(all => {
      if (!live) return
      const sum = new Map<string, BarRow>()
      for (const list of all) for (const s of list as any[]) {
        const row = sum.get(s.bucket) ?? { bucket: s.bucket, error: 0, other: 0 }
        row.error += s.error ?? 0
        row.other += (s.warning ?? 0) + (s.info ?? 0)
        sum.set(s.bucket, row)
      }
      setRows([...sum.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : 1)))
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const open = groups.filter(g => g.status === 'unresolved')
  const fresh = open.filter(g => g.first_seen && now - new Date(g.first_seen).getTime() < DAY)
  const last = groups.reduce<string | null>((a, g) => (!a || g.last_seen > a ? g.last_seen : a), null)
  const total = (rows ?? []).reduce((sum, r) => sum + r.error + r.other, 0)

  let headline: string
  let detail: string
  if (groups.length === 0) {
    headline = 'No events yet'
    detail = `Nothing has been reported for ${scope}. Connect an app to start.`
  } else if (open.length === 0) {
    headline = 'All clear'
    detail = `Nothing is open in ${scope}. Last event ${last ? timeAgo(last, now) : 'unknown'}.`
  } else {
    headline = `${open.length} open ${open.length === 1 ? 'issue' : 'issues'}`
    detail = `${fresh.length ? `${fresh.length} first seen in the last 24 hours. ` : 'None are new in the last 24 hours. '}Last event ${last ? timeAgo(last, now) : 'unknown'}.`
  }

  return (
    <section data-testid="overview-status" className="grid gap-4 rounded-lg border border-slate-700 bg-slate-950 p-4 sm:gap-6 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
      <div>
        <h2 className={`text-2xl font-semibold text-slate-100`} data-testid="overview-headline">{headline}</h2>
        <p className="mt-1 text-sm text-slate-300">{detail}</p>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-slate-300">Events per hour, last 24 hours</span>
          <span className="tabular-nums text-slate-400">{rows === null ? '' : `${total.toLocaleString()} total`}</span>
        </div>
        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400" data-testid="overview-legend">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-red-500" aria-hidden="true" />Errors</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-slate-500" aria-hidden="true" />Warnings and info</span>
          <span>Includes resolved issues</span>
        </div>
        {rows === null ? (
          <div className="h-12 animate-pulse rounded bg-slate-800/50" aria-busy="true" />
        ) : rows.length === 0 ? (
          <p className="h-12 text-sm text-slate-400">No event counts available for this range.</p>
        ) : (
          <EventBars rows={rows} height={48} startLabel="24 hours ago" endLabel="now" unit="events per hour" />
        )}
      </div>
    </section>
  )
}
