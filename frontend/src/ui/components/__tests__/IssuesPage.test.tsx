import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IssuesPage, sortIssues, ISSUE_PAGE_SIZE } from '../IssuesPage'
import type { Issue } from '../../types/issue.types'

vi.mock('../../utils/api.utils', () => ({ api: vi.fn() }))
import { api } from '../../utils/api.utils'

const project = { id: 1, name: 'Web', slug: 'web', ingest_token: 't' }
const make = (id: number, over: Partial<Issue> = {}): Issue => ({
  id, project: 1, title: `Issue ${id}`, level: 'error', count: id, first_seen: `2026-11-0${(id % 9) + 1}T00:00:00Z`,
  last_seen: `2026-11-1${(id % 9)}T00:00:00Z`, status: 'unresolved', resolved_at: null, assignee: '', is_bookmarked: false, ...over,
})

const renderPage = (over: Partial<Parameters<typeof IssuesPage>[0]> = {}) => {
  const props = { project, status: 'unresolved' as const, query: '', onStatus: vi.fn(), onQuery: vi.fn(), onOpen: vi.fn(), ...over }
  return { props, ...render(<IssuesPage {...props} />) }
}

beforeEach(() => { vi.mocked(api).mockReset() })

describe('IssuesPage', () => {
  it('asks for the selected project\'s issues and lists them with counts per status', async () => {
    vi.mocked(api).mockResolvedValue([make(1), make(2, { status: 'resolved' }), make(3, { status: 'ignored' }), make(4)])
    renderPage()
    await screen.findByTestId('issues-table')
    expect(api).toHaveBeenCalledWith('/api/groups/?project=web')
    expect(screen.getByTestId('issues-tab-unresolved')).toHaveTextContent('Unresolved 2')
    expect(screen.getByTestId('issues-tab-resolved')).toHaveTextContent('Resolved 1')
    expect(screen.getByTestId('issues-tab-ignored')).toHaveTextContent('Ignored 1')
    expect(screen.getByTestId('issues-tab-all')).toHaveTextContent('All 4')
    expect(screen.getByTestId('issue-row-1')).toBeInTheDocument()
    expect(screen.queryByTestId('issue-row-2')).not.toBeInTheDocument()   // resolved: hidden under the Unresolved tab
  })

  it('filters by the status tab, and "All" shows everything', async () => {
    vi.mocked(api).mockResolvedValue([make(1), make(2, { status: 'resolved' })])
    renderPage({ status: 'resolved' })
    await screen.findByTestId('issues-table')
    expect(screen.getByTestId('issue-row-2')).toBeInTheDocument()
    expect(screen.queryByTestId('issue-row-1')).not.toBeInTheDocument()
  })

  it('reports tab and search changes to the router instead of keeping them privately', async () => {
    vi.mocked(api).mockResolvedValue([make(1)])
    const { props } = renderPage()
    await screen.findByTestId('issues-table')
    fireEvent.click(screen.getByTestId('issues-tab-all'))
    expect(props.onStatus).toHaveBeenCalledWith('all')
    fireEvent.change(screen.getByTestId('issues-search'), { target: { value: 'boom' } })
    expect(props.onQuery).toHaveBeenCalledWith('boom')
  })

  it('searches titles and assignees, ignoring case', async () => {
    vi.mocked(api).mockResolvedValue([make(1, { title: 'KeyError: user_id' }), make(2, { title: 'Timeout', assignee: 'Dana' }), make(3, { title: 'Other' })])
    renderPage({ query: 'dana' })
    await screen.findByTestId('issues-table')
    expect(screen.getByTestId('issue-row-2')).toBeInTheDocument()
    expect(screen.queryByTestId('issue-row-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('issue-row-3')).not.toBeInTheDocument()
  })

  it('opens an issue on a plain click but leaves ctrl-click to the browser (new tab)', async () => {
    vi.mocked(api).mockResolvedValue([make(7, { title: 'Open me' })])
    const { props } = renderPage()
    const link = await screen.findByRole('link', { name: 'Open me' })
    expect(link).toHaveAttribute('href', '#view=issues&project=web&issue=7')
    fireEvent.click(link, { ctrlKey: true })
    expect(props.onOpen).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(props.onOpen).toHaveBeenCalledWith(7)
  })

  it('sorts by last seen, first seen and event count', () => {
    const list = [make(1, { count: 5, first_seen: '2026-01-02T00:00:00Z', last_seen: '2026-03-01T00:00:00Z' }), make(2, { count: 50, first_seen: '2026-01-01T00:00:00Z', last_seen: '2026-02-01T00:00:00Z' })]
    expect(sortIssues(list, 'last_seen').map(i => i.id)).toEqual([1, 2])
    expect(sortIssues(list, 'first_seen').map(i => i.id)).toEqual([1, 2])
    expect(sortIssues(list, 'count').map(i => i.id)).toEqual([2, 1])
    expect(list.map(i => i.id)).toEqual([1, 2])   // the input is not mutated
  })

  it('shows 50 at a time and loads more on request', async () => {
    vi.mocked(api).mockResolvedValue(Array.from({ length: ISSUE_PAGE_SIZE + 5 }, (_, i) => make(i + 1)))
    renderPage()
    await screen.findByTestId('issues-table')
    expect(screen.getAllByTestId(/^issue-row-/)).toHaveLength(ISSUE_PAGE_SIZE)
    expect(screen.getByText(`Showing ${ISSUE_PAGE_SIZE} of ${ISSUE_PAGE_SIZE + 5}`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getAllByTestId(/^issue-row-/)).toHaveLength(ISSUE_PAGE_SIZE + 5)
  })

  it('explains an empty project, a filter with no matches, and a failed load', async () => {
    vi.mocked(api).mockResolvedValueOnce([])
    const first = renderPage()
    expect(await screen.findByTestId('issues-empty')).toHaveTextContent('No issues yet')
    first.unmount()

    vi.mocked(api).mockResolvedValueOnce([make(1)])
    const { props } = renderPage({ query: 'zzz' })
    expect(await screen.findByTestId('issues-no-match')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(props.onStatus).toHaveBeenCalledWith('all'); expect(props.onQuery).toHaveBeenCalledWith('')

    vi.mocked(api).mockRejectedValueOnce(new Error('API Error 500'))
    render(<IssuesPage project={{ ...project, slug: 'other' }} status="unresolved" query="" onStatus={vi.fn()} onQuery={vi.fn()} onOpen={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByTestId('issues-error').length).toBeGreaterThan(0))
    expect(within(screen.getAllByTestId('issues-error')[0]).getByText('API Error 500')).toBeInTheDocument()
  })
})
