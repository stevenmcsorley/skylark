import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IssueDetail, tagPairs } from '../IssueDetail'
import { ToastProvider } from '../ui'
import type { Issue, IssueEvent } from '../../types/issue.types'

vi.mock('../../utils/api.utils', () => ({ api: vi.fn() }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { email: 'me@example.test' } }) }))
import { api } from '../../utils/api.utils'

const issue: Issue = { id: 5, project: 1, title: 'KeyError: user_id', level: 'error', count: 42, first_seen: '2026-11-01T00:00:00Z', last_seen: '2026-11-20T00:00:00Z',
  status: 'unresolved', resolved_at: null, assignee: '', is_bookmarked: false }
const events: IssueEvent[] = [
  { id: 11, message: 'KeyError: user_id', level: 'error', received_at: '2026-11-20T00:00:00Z', environment: 'production',
    stack: "KeyError: 'user_id'\n    at handler (app/routes.py:48:0)", tags: { region: 'eu' }, payload: { release: '1.2.3', user: { email: 'a@b.c' } } },
  { id: 10, message: 'older one', level: 'error', received_at: '2026-11-19T00:00:00Z', environment: 'staging', stack: 'older\n    at x (a.py:1:0)' },
]

const route = (over: Record<string, any> = {}) => (path: string, opts?: RequestInit) => {
  const key = `${opts?.method ?? 'GET'} ${path}`
  if (key in over) { const v = over[key]; return v instanceof Error ? Promise.reject(v) : Promise.resolve(v) }
  if (path === '/api/groups/5/') return Promise.resolve(issue)
  if (path.startsWith('/api/events/')) return Promise.resolve({ count: 2, results: events })
  if (path === '/api/groups/5/comments/' && !opts?.method) return Promise.resolve([{ id: 1, group: 5, author: 'dana', body: 'on it', created_at: '2026-11-20T01:00:00Z' }])
  return Promise.reject(new Error(`unexpected ${key}`))
}

const renderDetail = (onBack = vi.fn()) => render(<ToastProvider><IssueDetail issueId={5} onBack={onBack} /></ToastProvider>)
beforeEach(() => { vi.mocked(api).mockReset() })

describe('IssueDetail', () => {
  it('loads the issue, this issue\'s events and its comments', async () => {
    vi.mocked(api).mockImplementation(route())
    renderDetail()
    expect(await screen.findByTestId('issue-title')).toHaveTextContent('KeyError: user_id')
    expect(api).toHaveBeenCalledWith('/api/events/?group=5&limit=25')
    expect(screen.getByTestId('issue-stack')).toHaveTextContent('at handler (app/routes.py:48:0)')
    expect(screen.getByTestId('issue-details')).toHaveTextContent('1.2.3')
    expect(screen.getByTestId('issue-details')).toHaveTextContent('region')
    expect(screen.getByTestId('issue-comments')).toHaveTextContent('on it')
  })

  it('does not repeat the message when it is the first line of the stack', async () => {
    vi.mocked(api).mockImplementation(route({ 'GET /api/events/?group=5&limit=25': { results: [{ ...events[0], message: "KeyError: 'user_id'" }] } }))
    renderDetail()
    await screen.findByTestId('issue-stack')
    expect(screen.queryByTestId('issue-event-message')).not.toBeInTheDocument()
  })

  it('resolving sends the request and shows the new state, then offers to reopen', async () => {
    const resolved = { ...issue, status: 'resolved' as const }
    vi.mocked(api).mockImplementation(route({ 'POST /api/groups/5/resolve/': resolved }))
    renderDetail()
    fireEvent.click(await screen.findByTestId('issue-resolve'))
    await screen.findByTestId('issue-unresolve')
    expect(api).toHaveBeenCalledWith('/api/groups/5/resolve/', { method: 'POST' })
    expect(screen.queryByTestId('issue-resolve')).not.toBeInTheDocument()
  })

  it('ignore and bookmark use their own endpoints', async () => {
    vi.mocked(api).mockImplementation(route({ 'POST /api/groups/5/ignore/': { ...issue, status: 'ignored' }, 'POST /api/groups/5/bookmark/': { ...issue, is_bookmarked: true } }))
    renderDetail()
    fireEvent.click(await screen.findByTestId('issue-ignore'))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/groups/5/ignore/', { method: 'POST' }))
    fireEvent.click(screen.getByTestId('issue-bookmark'))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/groups/5/bookmark/', { method: 'POST' }))
  })

  it('saves the assignee when the field loses focus, and only if it changed', async () => {
    vi.mocked(api).mockImplementation(route({ 'POST /api/groups/5/assign/': { ...issue, assignee: 'dana' } }))
    renderDetail()
    const field = await screen.findByTestId('issue-assignee')
    fireEvent.blur(field)                                   // unchanged: no request
    expect(api).not.toHaveBeenCalledWith('/api/groups/5/assign/', expect.anything())
    fireEvent.change(field, { target: { value: ' dana ' } })
    fireEvent.blur(field)
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/groups/5/assign/', { method: 'POST', body: JSON.stringify({ assignee: 'dana' }) }))
  })

  it('adds a comment as the signed-in user, newest first, and clears the box', async () => {
    const created = { id: 2, group: 5, author: 'me@example.test', body: 'fixing now', created_at: '2026-11-21T00:00:00Z' }
    vi.mocked(api).mockImplementation(route({ 'POST /api/groups/5/comments/': created }))
    renderDetail()
    const box = await screen.findByTestId('issue-comment-input')
    expect(screen.getByTestId('issue-comment-submit')).toBeDisabled()
    fireEvent.change(box, { target: { value: '  fixing now ' } })
    fireEvent.click(screen.getByTestId('issue-comment-submit'))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/groups/5/comments/', { method: 'POST', body: JSON.stringify({ body: 'fixing now', author: 'me@example.test' }) }))
    const items = (await screen.findByTestId('issue-comments')).querySelectorAll('li')
    expect(items[0]).toHaveTextContent('fixing now'); expect(items).toHaveLength(2)
    expect(box).toHaveValue('')
  })

  it('selecting an older event shows its stack', async () => {
    vi.mocked(api).mockImplementation(route())
    renderDetail()
    await screen.findByTestId('issue-stack')
    fireEvent.click(screen.getByTestId('issue-event-10'))
    expect(screen.getByTestId('issue-stack')).toHaveTextContent('at x (a.py:1:0)')
  })

  it('goes back, and shows an error with a retry when loading fails', async () => {
    const onBack = vi.fn()
    vi.mocked(api).mockRejectedValue(new Error('API Error 404'))
    renderDetail(onBack)
    expect(await screen.findByTestId('issue-error')).toHaveTextContent('API Error 404')
    fireEvent.click(screen.getByTestId('issue-back'))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('tagPairs', () => {
  it('reads a dict, a list of strings and a list of {key, value}', () => {
    expect(tagPairs({ a: '1' })).toEqual([['a', '1']])
    expect(tagPairs(['env:prod', 'plain'])).toEqual([['env', 'prod'], ['tag', 'plain']])
    expect(tagPairs([{ key: 'k', value: 'v' }, { value: 'x' }])).toEqual([['k', 'v'], ['tag', 'x']])
    expect(tagPairs(undefined)).toEqual([])
  })
})
