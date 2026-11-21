export const fmtDate = (iso: string): string => {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  } catch {
    return iso
  }
}

export const normISO = (s: string): string => {
  if (!s) return s
  if (s.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(s)) return s.replace(' ', 'T')
  return s.replace(' ', 'T') + 'Z'
}

export const toInputLocal = (iso?: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** "5m ago", "3h ago", "2d ago"; falls back to the date for anything older than 30 days. `now` is injectable for tests. */
export const timeAgo = (iso: string, now: number = Date.now()): string => {
  const then = new Date(normISO(iso)).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days <= 30) return `${days}d ago`
  return fmtDate(iso)
}
