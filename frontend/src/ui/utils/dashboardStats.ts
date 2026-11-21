export type Bucket = { error: number; warning: number; info: number }

export const totalEvents = (series: readonly Bucket[]): number =>
  series.reduce((sum, row) => sum + row.error + row.warning + row.info, 0)

export const errorRate = (series: readonly Bucket[]): number | null => {
  const total = totalEvents(series)
  return total ? series.reduce((sum, row) => sum + row.error, 0) / total * 100 : null
}

export const rateTone = (rate: number | null): 'none' | 'good' | 'warn' | 'bad' => {
  if (rate === null) return 'none'
  if (rate === 0) return 'good'
  return rate < 5 ? 'warn' : 'bad'
}

export const crashFreeRate = (health: readonly { crash_free_rate: number }[]): number | null =>
  health.length ? health.reduce((sum, row) => sum + row.crash_free_rate, 0) / health.length : null

export const eventsPerMinute = (series: readonly Bucket[], intervalMinutes: number): number | null =>
  series.length ? totalEvents(series) / (series.length * intervalMinutes) : null
