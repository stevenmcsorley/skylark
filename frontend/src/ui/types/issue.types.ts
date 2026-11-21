export type IssueStatus = 'unresolved' | 'resolved' | 'ignored'

/** A grouped error, as returned by /api/groups/. */
export interface Issue {
  id: number
  project: number
  title: string
  level: string
  count: number
  first_seen: string
  last_seen: string
  status: IssueStatus
  resolved_at: string | null
  assignee: string
  is_bookmarked: boolean
}

export interface IssueComment {
  id: number
  group: number
  author: string
  body: string
  created_at: string
}

export interface IssueEvent {
  id: number
  message: string
  level: string
  received_at: string
  environment?: string
  release?: number | null
  stack?: string | null
  tags?: Array<{ key?: string; value: string } | string> | Record<string, string>
  payload?: Record<string, any>
}
