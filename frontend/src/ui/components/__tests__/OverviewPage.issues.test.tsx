import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverviewPage } from '../OverviewPage'

vi.mock('../TrackingOverview', () => ({ TrackingOverview: () => null }))
vi.mock('../../utils/api.utils', () => ({ api: vi.fn().mockResolvedValue({ integrations: [] }) }))

const group = (id: number, status: string) => ({ id, title: `Problem ${id}`, level: 'error', count: 3, status, last_seen: new Date().toISOString(), assignee: null }) as any

const baseProps: any = {
  selected: { id: 1, slug: 'web', name: 'web' }, releases: [], createRelease: vi.fn(), deploys: [], createDeployment: vi.fn(),
  sessionUser: '', setSessionUser: vi.fn(), sendSession: vi.fn(), range: '24h', setRange: vi.fn(), interval: '1h', setInterval: vi.fn(),
  refreshSeries: vi.fn(), series: [], health: [], rules: [], createRule: vi.fn(), editRule: { threshold: 1, window: 1, notify: 1 },
  setEditRule: vi.fn(), updateFirstRule: vi.fn(), setGroups: vi.fn(), snoozeGroup: vi.fn(),
}

describe('OverviewPage issues', () => {
  it('counts and lists only open issues, linking to the issue page', () => {
    render(<OverviewPage {...baseProps} groups={[group(1, 'unresolved'), group(2, 'resolved'), group(3, 'ignored')]} />)
    expect(screen.getByTestId('open-groups-count').textContent).toBe('1')
    const link = screen.getByText('Problem 1').closest('a')!
    expect(link.getAttribute('href')).toContain('issue=1')
    expect(screen.queryByText('Problem 2')).toBeNull()
  })

  it('says so when nothing is open', () => {
    render(<OverviewPage {...baseProps} groups={[group(2, 'resolved')]} />)
    expect(screen.getByText('No open issues.')).toBeTruthy()
  })
})
