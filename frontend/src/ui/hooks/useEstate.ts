import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api.utils'

export interface EstateRow {
  id: number
  name: string
  slug: string
  description: string
  events_total: number
  unresolved: number
  last_event_at: string | null
  latest_issue: { title: string; level: string; last_seen: string } | null
  last_deploy: { version: string; environment: string; at: string } | null
  active_monitors: number
}

export interface Estate {
  projects: EstateRow[]
  totals: { projects: number; events_total: number; unresolved_total: number }
  integrations: string[]
}

/** One summary of every app in the workspace: feeds the Inbox count, the Apps list and the first-run path. */
export const useEstate = (reloadKey: unknown = 0) => {
  const [estate, setEstate] = useState<Estate | null>(null)
  const reload = useCallback(() => api('/api/estate/').then(setEstate).catch(() => setEstate(null)), [])
  useEffect(() => { reload() }, [reload, reloadKey])
  return { estate, reload }
}
