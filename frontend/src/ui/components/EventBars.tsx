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
  testId?: string
}

/** Real counts as plain bars: errors in red, everything else in slate. No smoothing, no decoration. */
export const EventBars = ({ rows, height = 64, startLabel, endLabel, unit, testId = 'event-bars' }: EventBarsProps) => {
  const max = Math.max(1, ...rows.map(r => r.error + r.other))
  const total = rows.reduce((sum, r) => sum + r.error + r.other, 0)
  const bar = (n: number) => (n > 0 ? Math.max(2, Math.round((n / max) * height)) : 0)

  return (
    <figure className="m-0" data-testid={testId}>
      <div role="img" aria-label={`${total} ${unit}, tallest bar ${max}`} className="flex items-end gap-px" style={{ height }}>
        {rows.map(r => (
          <div key={r.bucket} className="flex min-w-0 flex-1 flex-col justify-end" title={`${r.error + r.other} (${r.error} errors) · ${r.bucket}`}>
            <div className="bg-slate-600" style={{ height: bar(r.other) }} />
            <div className="bg-red-500" style={{ height: bar(r.error) }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  )
}
