export interface BarRow {
  bucket: string
  error: number
  other: number
}

interface EventBarsProps {
  rows: BarRow[]
  /** Pixel height of the tallest bar. */
  height?: number
  startLabel: string
  endLabel: string
  /** What the bars count, for the accessible name, e.g. "events per hour". */
  unit: string
  /** How to name one bar in its tooltip and in the text alternative. */
  label?: (bucket: string) => string
  testId?: string
}

const defaultLabel = (bucket: string) => {
  const d = new Date(bucket)
  return Number.isNaN(d.getTime()) ? bucket : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Real counts as plain bars on a baseline: errors in red, everything else in slate.
 * The scale is written out (the tallest bar's value), every bar has a tooltip, and the same numbers are
 * available as a table for screen readers. No smoothing, no decoration.
 */
export const EventBars = ({ rows, height = 64, startLabel, endLabel, unit, label = defaultLabel, testId = 'event-bars' }: EventBarsProps) => {
  const max = Math.max(1, ...rows.map(r => r.error + r.other))
  const total = rows.reduce((sum, r) => sum + r.error + r.other, 0)
  const bar = (n: number) => (n > 0 ? Math.max(2, Math.round((n / max) * height)) : 0)

  return (
    <figure className="m-0" data-testid={testId}>
      <div>
        <div className="mb-1 text-xs tabular-nums text-slate-400" aria-hidden="true" data-testid={`${testId}-max`}>max {max.toLocaleString()}</div>
        <div aria-hidden="true" className="flex items-end gap-0.5 border-b border-slate-600" style={{ height }}>
          {rows.map(r => (
            <div key={r.bucket} className="group flex h-full min-w-0 flex-1 flex-col justify-end hover:bg-slate-800/60" title={`${label(r.bucket)}: ${r.error + r.other} (${r.error} errors)`}>
              <div className="bg-slate-500" style={{ height: bar(r.other) }} />
              <div className="bg-red-500" style={{ height: bar(r.error) }} />
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{`${total} ${unit}`}</caption>
        <thead><tr><th>When</th><th>Errors</th><th>Other</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.bucket}><td>{label(r.bucket)}</td><td>{r.error}</td><td>{r.other}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
