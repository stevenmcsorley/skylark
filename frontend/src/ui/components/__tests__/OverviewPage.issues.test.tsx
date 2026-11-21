import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverviewPage } from '../OverviewPage'

vi.mock('../TrackingOverview', () => ({ TrackingOverview: () => null }))
vi.mock('../../utils/api.utils', () => ({ api: vi.fn().mockResolvedValue({ integrations: [] }) }))
vi.mock('../OverviewStatus', async () => {
  const actual = await vi.importActual<typeof import('../OverviewStatus')>('../OverviewStatus')
  return actual
})

const group = (id: number, status: string, firstSeen = new Date(Date.now() - 3 * 86400000).toISOString()) => ({ id, title: `Problem ${id}`, level: 'error', count: 3, status, first_seen: firstSeen, last_seen: new Date().toISOString(), assignee: null }) as any

const baseProps: any = {
  selected: { id: 1, slug: 'web', name: 'web' }, releases: [], createRelease: vi.fn(), deploys: [], createDeployment: vi.fn(),
  sessionUser: '', setSessionUser: vi.fn(), sendSession: vi.fn(), range: '24h', setRange: vi.fn(), interval: '1h', setInterval: vi.fn(),
  refreshSeries: vi.fn(), series: [], health: [], rules: [], createRule: vi.fn(), editRule: { threshold: 1, window: 1, notify: 1 },
  setEditRule: vi.fn(), updateFirstRule: vi.fn(), setGroups: vi.fn(), snoozeGroup: vi.fn(),
}

describe('OverviewPage issues', () => {
  it('counts and lists only open issues, linking to the issue page', () => {
    render(<OverviewPage {...baseProps} groups={[group(1, 'unresolved'), group(2, 'resolved'), group(3, 'ignored')]} />)
    expect(screen.getByTestId('overview-headline').textContent).toBe('1 open issue')
    const link = screen.getByText('Problem 1').closest('a')!
    expect(link.getAttribute('href')).toContain('issue=1')
    expect(screen.queryByText('Problem 2')).toBeNull()
  })

  it('says so when nothing is open', () => {
    render(<OverviewPage {...baseProps} groups={[group(2, 'resolved')]} />)
    expect(screen.getByText('No open issues.')).toBeTruthy()
    expect(screen.getByTestId('overview-headline').textContent).toBe('All clear')
  })

  it('puts issues first seen in the last 24 hours at the top, marked New', () => {
    render(<OverviewPage {...baseProps} groups={[group(1, 'unresolved'), group(2, 'unresolved', new Date().toISOString())]} />)
    const rows = screen.getAllByTestId(/^group-\d+$/)
    expect(rows[0].textContent).toContain('Problem 2')
    expect(rows[0].textContent).toContain('New')
    expect(rows[1].textContent).not.toContain('New')
  })

  it('keeps releases, deployments and alert rules reachable but out of the first screen', () => {
    render(<OverviewPage {...baseProps} groups={[]} />)
    expect(screen.getByTestId('setup-section').tagName).toBe('DETAILS')
    expect(screen.getByTestId('alert-rules-count').textContent).toBe('0')
  })
})
